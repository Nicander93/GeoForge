import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import tiling  # noqa: E402


def random_elements(count, seed=0):
    rng = np.random.default_rng(seed)
    low = rng.uniform(0, 100, (count, 3)) * [1, 1, 0.3]
    sizes = rng.choice([0.5, 1.0, 6.0, 80.0], count, p=[0.5, 0.3, 0.19, 0.01])
    high = low + sizes[:, None] * [1, 0.5, 0.2]
    triangles = rng.integers(12, 400, count)
    return low, high, triangles


class TilingTest(unittest.TestCase):
    def test_every_element_lands_in_exactly_one_tile_within_budget(self):
        low, high, triangles = random_elements(5000)
        root = tiling.build_tree(low, high, triangles, keys=np.arange(5000), max_features=300, max_triangles=40000)
        tiles = list(root.walk())
        placed = np.concatenate([tile.elements for tile in tiles])
        self.assertEqual(sorted(placed.tolist()), list(range(5000)))
        for tile in tiles:
            self.assertLessEqual(len(tile.elements), 300)
            self.assertLessEqual(int(triangles[tile.elements].sum()), 40000)

    def test_tiles_enclose_their_subtree_and_errors_shrink_downwards(self):
        low, high, triangles = random_elements(3000, seed=1)
        root = tiling.build_tree(low, high, triangles, keys=np.arange(3000), max_features=200)
        sizes = np.linalg.norm(high - low, axis=1)

        def check(tile):
            below = np.concatenate([child_tile.elements for child in tile.children for child_tile in child.walk()]
                                   or [np.zeros(0, dtype=int)])
            subtree = np.concatenate([tile.elements, below])
            self.assertTrue(np.all(low[subtree] >= tile.low - 1e-9) and np.all(high[subtree] <= tile.high + 1e-9))
            if tile.children:
                self.assertAlmostEqual(tile.geometric_error, float(sizes[below].max()))
            else:
                self.assertEqual(tile.geometric_error, 0.0)
            for child in tile.children:
                self.assertLessEqual(child.geometric_error, tile.geometric_error)
                check(child)

        check(root)

    def test_large_elements_stay_near_the_root(self):
        low, high, triangles = random_elements(4000, seed=2)
        root = tiling.build_tree(low, high, triangles, keys=np.arange(4000), max_features=250)
        sizes = np.linalg.norm(high - low, axis=1)
        depth = {}
        for tile in root.walk():
            for element in tile.elements:
                depth[int(element)] = tile.address.count("-")
        big = [depth[i] for i in np.flatnonzero(sizes > 50)]
        small = [depth[i] for i in np.flatnonzero(sizes < 1)]
        self.assertTrue(big and small)
        self.assertEqual(max(big), 0, "80 m elements fit the root budget")
        self.assertGreater(min(small), 0)

    def test_result_does_not_depend_on_input_order(self):
        low, high, triangles = random_elements(2000, seed=3)
        keys = np.array([f"G{i:05d}" for i in range(2000)])
        first = tiling.build_tree(low, high, triangles, keys=keys, max_features=150)
        order = np.random.default_rng(9).permutation(2000)
        second = tiling.build_tree(low[order], high[order], triangles[order], keys=keys[order], max_features=150)

        def layout(root, names):
            return [(tile.address, names[tile.elements].tolist()) for tile in root.walk()]

        self.assertEqual(layout(first, keys), layout(second, keys[order]))

    def test_single_mode_and_small_inputs_make_one_tile(self):
        low, high, triangles = random_elements(50, seed=4)
        for root in (tiling.build_tree(low, high, triangles, single=True, max_features=10),
                     tiling.build_tree(low, high, triangles)):
            self.assertEqual(root.children, [])
            self.assertEqual(len(root.elements), 50)
            self.assertEqual(root.geometric_error, 0.0)

    def test_identical_positions_still_split(self):
        low = np.zeros((40, 3))
        high = np.ones((40, 3))
        root = tiling.build_tree(low, high, np.full(40, 12), keys=np.arange(40), max_features=10)
        stats = tiling.tree_stats(root)
        self.assertLessEqual(stats["maxFeatures"], 10)
        self.assertEqual(sum(len(tile.elements) for tile in root.walk()), 40)


if __name__ == "__main__":
    unittest.main()
