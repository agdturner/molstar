/**
 * Copyright (c) 2018-2025 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Andy Turner <agdturner@gmail.com>
 */
import { Vec3, Mat4 } from '../../../mol-math/linear-algebra';
import { QCProt } from './qcprot';

/**
 * Compute the centroid of a set of coordinates.
 * @param coords Array of Vec3 coordinates
 * @returns Centroid as Vec3
 */
export function computeCentroid(coords: Vec3[]): Vec3 {
    const sum = coords.reduce((acc, c) => {
        const result = Vec3.zero();
        return Vec3.add(result, acc, c);
    }, Vec3.zero());
    const centroid = Vec3.zero();
    return Vec3.scale(centroid, sum, 1 / coords.length);
}

/**
 * Handles coordinate transformations for 3D datasets.
 * Centralizes coordinates on construction.
 */
export class CoordinateTransformer {
    private transformedCoords: Vec3[];

    constructor(coords: Vec3[]) {
        const centroid = computeCentroid(coords);
        this.transformedCoords = coords.map(c => {
            const result = Vec3.zero();
            return Vec3.sub(result, c, centroid);
        });
    }

    /**
     * Translate coordinates by a given vector.
     * @param v Translation vector
     */
    translate(v: Vec3): void {
        this.transformedCoords = this.transformedCoords.map(c => {
            const result = Vec3.zero();
            return Vec3.add(result, c, v);
        });
    }

    /**
     * Rotate coordinates by a given rotation matrix.
     * @param rotation Rotation matrix
     */
    rotate(rotation: Mat4): void {
        this.transformedCoords = this.transformedCoords.map(c => {
            const result = Vec3.zero();
            return Vec3.transformMat4(result, c, rotation);
        });
    }

    /**
     * Get transformed coordinates for rendering.
     * @returns Array of transformed Vec3 coordinates
     */
    getTransformedCoordinates(): Vec3[] {
        return this.transformedCoords;
    }
}

/**
 * Align incoming dataset to existing dataset using centroid translation.
 * @param symbol_type Array of atom types of atoms to align
 * @param newX X coordinates to align
 * @param newY Y coordinates to align
 * @param newZ Z coordinates to align
 * @param type Array of atom types of data to align with
 * @param x X coordinates to align with
 * @param y Y coordinates to align with
 * @param z Z coordinates to align with
 * @return Aligned coordinates as {alignedX, alignedY, alignedZ}
 */
export function alignDataset(
    symbol_type: string[],
    newX: number[],
    newY: number[],
    newZ: number[],
    type: string[],
    x: number[],
    y: number[],
    z: number[]
): { alignedX: number[]; alignedY: number[]; alignedZ: number[] } {
    // Implementation will go here
    // Get indices of phosporous atoms
    const newPhosphorusIndices: number[] = [];
    let newCount: number = 0;
    for (let i = 0; i < symbol_type.length; i++) {
        if (symbol_type[i] === 'P') {
            newPhosphorusIndices.push(i);
            //console.log(`Phosphorus atom found at index ${i}`);
            newCount++;
        }
    }
    console.log(`Total phosphorus atoms found in data to align: ${newCount}`);
    const phosphorusIndices: number[] = [];
    let count: number = 0;
    for (let i = 0; i < symbol_type.length; i++) {
        if (type[i] === 'P') {
            phosphorusIndices.push(i);
            //console.log(`Phosphorus atom found at index ${i}`);
            count++;
        }
    }
    console.log(`Total phosphorus atoms found in data to align from: ${count}`);
    if (newCount !== count) {
        if (newCount > count) {
            // Select the count closest new phosphorus atoms to the centroid.
            // 1. Calculate centroid.
            const coords: Vec3[] = [];
            for (let i = 0; i < newCount; i++) {
                const idx = newPhosphorusIndices[i];
                coords.push(Vec3.create(newX[idx], newY[idx], newZ[idx]));
            }
            const centroid = computeCentroid(coords);
            // 2. Calculate distances to centroid.
            const distances: { index: number; distance: number }[] = [];
            for (let i = 0; i < newCount; i++) {
                const idx = newPhosphorusIndices[i];
                const atomCoord = Vec3.create(newX[idx], newY[idx], newZ[idx]);
                const distance = Vec3.distance(atomCoord, centroid);
                distances.push({ index: idx, distance: distance });
            }
            // 3. Sort distances and select closest 'count' atoms.
            distances.sort((a, b) => a.distance - b.distance);
            const selectedIndices = distances.slice(0, count).map(d => d.index);
            console.log(`Selected phosphorus atom indices for alignment: ${selectedIndices}`);
            // 4. Update newX, newY, newZ to only include selected atoms.
            const filteredX: number[] = [];
            const filteredY: number[] = [];
            const filteredZ: number[] = [];
            for (const idx of selectedIndices) {
                filteredX.push(newX[idx]);
                filteredY.push(newY[idx]);
                filteredZ.push(newZ[idx]);
            }
            // 5. Create new aligned coordinates arrays.
            const qcprot = new QCProt(filteredX, filteredY, filteredZ, x, y, z);
            const result = qcprot.getRotatedCoordinates();
            return { alignedX: result.xR, alignedY: result.yR, alignedZ: result.zR };
        } else {
            // Select the newCount closest phosphorus atoms to the centroid.
            const coords: Vec3[] = [];
            for (let i = 0; i < count; i++) {
                const idx = phosphorusIndices[i];
                coords.push(Vec3.create(x[idx], y[idx], z[idx]));
            }
            const centroid = computeCentroid(coords);
            // 2. Calculate distances to centroid.
            const distances: { index: number; distance: number }[] = [];
            for (let i = 0; i < count; i++) {
                const idx = phosphorusIndices[i];
                const atomCoord = Vec3.create(x[idx], y[idx], z[idx]);
                const distance = Vec3.distance(atomCoord, centroid);
                distances.push({ index: idx, distance: distance });
            }
            // 3. Sort distances and select closest 'newCount' atoms.
            distances.sort((a, b) => a.distance - b.distance);
            const selectedIndices = distances.slice(0, newCount).map(d => d.index);
            console.log(`Selected phosphorus atom indices for alignment: ${selectedIndices}`);
            // 4. Update x, y, z to only include selected atoms.
            const filteredX: number[] = [];
            const filteredY: number[] = [];
            const filteredZ: number[] = [];
            for (const idx of selectedIndices) {
                filteredX.push(x[idx]);
                filteredY.push(y[idx]);
                filteredZ.push(z[idx]);
            }
            // 5. Create new aligned coordinates arrays.
            const qcprot = new QCProt(newX, newY, newZ, filteredX, filteredY, filteredZ);
            const result = qcprot.getRotatedCoordinates();
            return { alignedX: result.xR, alignedY: result.yR, alignedZ: result.zR };               
        }
    } else {
            const qcprot = new QCProt(newX, newY, newZ, x, y, z);
            const result = qcprot.getRotatedCoordinates();
            return { alignedX: result.xR, alignedY: result.yR, alignedZ: result.zR };             
    }
}