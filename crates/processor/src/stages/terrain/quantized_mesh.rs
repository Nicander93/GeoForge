//! Decoder for Cesium quantized-mesh 1.0 tiles, used to check every tile CTB
//! writes. Extensions after the edge indices are not interpreted.

use flate2::read::GzDecoder;
use std::io::Read;

pub const QUANTIZED_MAX: u16 = 32767;
const HEADER_BYTES: usize = 88;

#[derive(Debug, Clone, PartialEq)]
pub struct QuantizedMeshTile {
    pub min_height: f32,
    pub max_height: f32,
    pub u: Vec<u16>,
    pub v: Vec<u16>,
    pub h: Vec<u16>,
    pub triangle_count: usize,
    pub west: Vec<u32>,
    pub south: Vec<u32>,
    pub east: Vec<u32>,
    pub north: Vec<u32>,
}

impl QuantizedMeshTile {
    pub fn height(&self, index: usize) -> f64 {
        let t = self.h[index] as f64 / QUANTIZED_MAX as f64;
        self.min_height as f64 + t * (self.max_height as f64 - self.min_height as f64)
    }
}

struct Cursor<'a> {
    bytes: &'a [u8],
    at: usize,
}

impl<'a> Cursor<'a> {
    fn take(&mut self, count: usize) -> Result<&'a [u8], String> {
        let end = self.at.checked_add(count).filter(|end| *end <= self.bytes.len()).ok_or("tile is truncated")?;
        let slice = &self.bytes[self.at..end];
        self.at = end;
        Ok(slice)
    }

    fn u16(&mut self) -> Result<u16, String> {
        Ok(u16::from_le_bytes(self.take(2)?.try_into().unwrap()))
    }

    fn u32(&mut self) -> Result<u32, String> {
        Ok(u32::from_le_bytes(self.take(4)?.try_into().unwrap()))
    }

    fn f32_at(&self, offset: usize) -> f32 {
        f32::from_le_bytes(self.bytes[offset..offset + 4].try_into().unwrap())
    }

    fn align(&mut self, to: usize) {
        self.at = self.at.div_ceil(to) * to;
    }
}

/// `bytes` may be gzip-compressed (CTB `-C` output) or raw.
pub fn decode(bytes: &[u8]) -> Result<QuantizedMeshTile, String> {
    let raw;
    let data = if bytes.starts_with(&[0x1f, 0x8b]) {
        let mut out = Vec::new();
        GzDecoder::new(bytes).read_to_end(&mut out).map_err(|error| format!("gzip decode failed: {error}"))?;
        raw = out;
        &raw[..]
    } else {
        bytes
    };
    if data.len() < HEADER_BYTES + 4 {
        return Err("tile is shorter than the quantized-mesh header".into());
    }
    let mut cursor = Cursor { bytes: data, at: HEADER_BYTES };
    let min_height = cursor.f32_at(24);
    let max_height = cursor.f32_at(28);
    if !min_height.is_finite() || !max_height.is_finite() || min_height > max_height {
        return Err(format!("invalid height range {min_height}..{max_height}"));
    }

    let vertex_count = cursor.u32()? as usize;
    if vertex_count < 3 {
        return Err(format!("only {vertex_count} vertices"));
    }
    let mut decode_channel = || -> Result<Vec<u16>, String> {
        let mut values = Vec::with_capacity(vertex_count);
        let mut value: i32 = 0;
        for _ in 0..vertex_count {
            let zigzag = cursor.u16()? as i32;
            value += (zigzag >> 1) ^ -(zigzag & 1);
            if !(0..=QUANTIZED_MAX as i32).contains(&value) {
                return Err(format!("quantized coordinate {value} out of range"));
            }
            values.push(value as u16);
        }
        Ok(values)
    };
    let u = decode_channel()?;
    let v = decode_channel()?;
    let h = decode_channel()?;

    let wide = vertex_count > 65_536;
    cursor.align(if wide { 4 } else { 2 });
    let read_index = |cursor: &mut Cursor|  -> Result<u32, String> {
        if wide {
            cursor.u32()
        } else {
            cursor.u16().map(u32::from)
        }
    };
    let triangle_count = cursor.u32()? as usize;
    let mut highest: u32 = 0;
    for _ in 0..triangle_count * 3 {
        let code = read_index(&mut cursor)?;
        if code > highest {
            return Err("index high-water mark violated".into());
        }
        let index = highest - code;
        if code == 0 {
            highest += 1;
        }
        if index as usize >= vertex_count {
            return Err(format!("triangle index {index} >= vertex count {vertex_count}"));
        }
    }
    let read_edge = |cursor: &mut Cursor|  -> Result<Vec<u32>, String> {
        let count = cursor.u32()? as usize;
        if count > vertex_count {
            return Err("edge list longer than vertex list".into());
        }
        let mut indices = Vec::with_capacity(count);
        for _ in 0..count {
            let index = read_index(cursor)?;
            if index as usize >= vertex_count {
                return Err(format!("edge index {index} >= vertex count {vertex_count}"));
            }
            indices.push(index);
        }
        Ok(indices)
    };
    let west = read_edge(&mut cursor)?;
    let south = read_edge(&mut cursor)?;
    let east = read_edge(&mut cursor)?;
    let north = read_edge(&mut cursor)?;
    Ok(QuantizedMeshTile { min_height, max_height, u, v, h, triangle_count, west, south, east, north })
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use flate2::write::GzEncoder;
    use flate2::Compression;
    use std::io::Write;

    fn zigzag(values: &[u16]) -> Vec<u8> {
        let mut previous = 0i32;
        let mut out = Vec::new();
        for value in values {
            let delta = *value as i32 - previous;
            previous = *value as i32;
            let encoded = ((delta << 1) ^ (delta >> 31)) as u16;
            out.extend_from_slice(&encoded.to_le_bytes());
        }
        out
    }

    /// A two-triangle tile covering the whole square; heights given 0..=32767.
    pub fn encode_square(min: f32, max: f32, h: [u16; 4], gzip: bool) -> Vec<u8> {
        let mut out = vec![0u8; HEADER_BYTES];
        out[24..28].copy_from_slice(&min.to_le_bytes());
        out[28..32].copy_from_slice(&max.to_le_bytes());
        out.extend_from_slice(&4u32.to_le_bytes());
        out.extend(zigzag(&[0, 32767, 32767, 0]));
        out.extend(zigzag(&[0, 0, 32767, 32767]));
        out.extend(zigzag(&h));
        out.extend_from_slice(&2u32.to_le_bytes());
        // Triangles (0,1,2) and (0,2,3) in high-water-mark encoding.
        for code in [0u16, 0, 0, 3, 1, 0] {
            out.extend_from_slice(&code.to_le_bytes());
        }
        for edge in [[0u16, 3], [0, 1], [1, 2], [3, 2]] {
            out.extend_from_slice(&2u32.to_le_bytes());
            for index in edge {
                out.extend_from_slice(&index.to_le_bytes());
            }
        }
        if !gzip {
            return out;
        }
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(&out).unwrap();
        encoder.finish().unwrap()
    }

    #[test]
    fn decodes_gzip_and_raw_tiles() {
        for gzip in [true, false] {
            let tile = decode(&encode_square(100.0, 200.0, [0, 32767, 16384, 0], gzip)).unwrap();
            assert_eq!(tile.u, vec![0, 32767, 32767, 0]);
            assert_eq!(tile.triangle_count, 2);
            assert_eq!(tile.east, vec![1, 2]);
            assert!((tile.height(1) - 200.0).abs() < 1e-3);
            assert!((tile.height(2) - 150.0).abs() < 0.01);
        }
    }

    #[test]
    fn rejects_truncated_or_corrupt_tiles() {
        let bytes = encode_square(0.0, 1.0, [0; 4], false);
        assert!(decode(&bytes[..bytes.len() - 3]).is_err());
        let mut gz = encode_square(0.0, 1.0, [0; 4], true);
        let last = gz.len() - 12;
        gz.truncate(last);
        assert!(decode(&gz).is_err());
        let mut bad_index = bytes.clone();
        // First triangle code must be 0; 5 breaks the high-water mark.
        let at = HEADER_BYTES + 4 + 24 + 4;
        bad_index[at..at + 2].copy_from_slice(&5u16.to_le_bytes());
        assert!(decode(&bad_index).is_err());
    }
}
