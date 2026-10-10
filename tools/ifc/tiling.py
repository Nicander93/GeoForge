"""Split elements into an explicit 3D Tiles tree with additive, size-based LOD.

Every element lands whole in exactly one tile. A tile keeps the elements that
are large compared with its own box (at least ``LARGE_FRACTION`` of its
diagonal), up to the per-tile budget; the rest go to up to eight children,
split at the median of their centres along each axis that is at least half
as long as the longest one, and only as many as the budget needs. Big slabs and facades
therefore sit near the root and furniture in the leaves.

A tile's geometric error is the largest element diagonal below it: that is
the size of what is missing on screen while its children are not loaded.
Leaves have error 0. Only numpy is needed.
"""

from dataclasses import dataclass, field

import numpy as np

LARGE_FRACTION = 0.25
MAX_DEPTH = 32
DEFAULT_MAX_FEATURES = 2000
DEFAULT_MAX_TRIANGLES = 250000


@dataclass
class Tile:
    address: str
    elements: np.ndarray
    low: np.ndarray
    high: np.ndarray
    geometric_error: float
    children: list = field(default_factory=list)

    def walk(self):
        yield self
        for child in self.children:
            yield from child.walk()


def build_tree(low, high, triangles, keys=None, max_features=DEFAULT_MAX_FEATURES,
               max_triangles=DEFAULT_MAX_TRIANGLES, single=False):
    """Return the root ``Tile``.

    ``low``/``high`` are (n, 3) element bounds, ``triangles`` (n,) counts and
    ``keys`` a sort key per element (GlobalId) that makes ties and element
    order independent of input order. ``single`` puts everything in the root.
    """
    low = np.asarray(low, dtype=np.float64)
    high = np.asarray(high, dtype=np.float64)
    triangles = np.asarray(triangles, dtype=np.int64)
    count = len(low)
    order = np.lexsort((np.arange(count),)) if keys is None else np.argsort(np.asarray(keys), kind="stable")
    sizes = np.linalg.norm(high - low, axis=1)
    centers = (low + high) / 2
    max_features = max(1, int(max_features))
    max_triangles = max(1, int(max_triangles))

    def node(indices, address, depth):
        box_low, box_high = low[indices].min(axis=0), high[indices].max(axis=0)
        fits = len(indices) <= max_features and triangles[indices].sum() <= max_triangles
        if single or fits or depth >= MAX_DEPTH or len(indices) == 1:
            return Tile(address, indices, box_low, box_high, 0.0)

        diagonal = float(np.linalg.norm(box_high - box_low))
        # Largest first; GlobalId order breaks ties.
        by_size = indices[np.argsort(-sizes[indices], kind="stable")]
        large = by_size[sizes[by_size] >= diagonal * LARGE_FRACTION]
        budget = np.cumsum(triangles[large])
        keep = large[(np.arange(len(large)) < max_features) & (budget <= max_triangles)]
        if len(keep) == 0 and len(large):
            keep = large[:1]
        rest = np.setdiff1d(indices, keep, assume_unique=True)
        rest = rest[np.argsort(rank[rest], kind="stable")]
        if len(rest) == 0:
            return Tile(address, np.sort(keep), box_low, box_high, 0.0)

        children = []
        for part_index, part in enumerate(split(rest)):
            children.append(node(part, f"{address}-{part_index}", depth + 1))
        keep = keep[np.argsort(rank[keep], kind="stable")]
        return Tile(address, keep, box_low, box_high, float(sizes[rest].max()), children)

    def split(indices):
        """Median split along up to three axes, each at least half as long as the longest.

        Stops once there are enough parts for the budget, so a node slightly
        over budget becomes two tiles, not eight.
        """
        needed = max(-(-len(indices) // max_features), -(-int(triangles[indices].sum()) // max_triangles), 2)
        parts = [indices]
        extent = centers[indices].max(axis=0) - centers[indices].min(axis=0)
        if extent.max() <= 0:
            middle = len(indices) // 2
            return [indices[:middle], indices[middle:]]
        for axis in np.argsort(-extent, kind="stable"):
            if len(parts) >= needed or extent[axis] < extent.max() / 2:
                break
            halves = []
            for part in parts:
                if len(part) < 2:
                    halves.append(part)
                    continue
                # Stable sort on the centre keeps equal centres in key order.
                ordered = part[np.argsort(centers[part, axis], kind="stable")]
                middle = len(ordered) // 2
                halves += [ordered[:middle], ordered[middle:]]
            parts = halves
        return [part for part in parts if len(part)]

    rank = np.empty(count, dtype=np.int64)
    rank[order] = np.arange(count)
    return node(order, "0", 0)


def tree_stats(root):
    tiles = list(root.walk())
    depth = max(tile.address.count("-") for tile in tiles) + 1
    with_content = [tile for tile in tiles if len(tile.elements)]
    return {"tiles": len(tiles), "contents": len(with_content), "depth": depth,
            "maxFeatures": max(len(tile.elements) for tile in tiles)}
