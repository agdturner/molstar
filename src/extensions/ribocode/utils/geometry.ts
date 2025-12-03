/**
 * Copyright (c) 2018-2025 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Andy Turner <agdturner@gmail.com>
 */
import { Vec3 } from '../../../mol-math/linear-algebra';
import { QCProt } from './qcprot';
import Big from 'big.js';

/**
 * Compute the centroid of a set of coordinates.
 * @param coords Array of Vec3 coordinates
 * @returns Centroid as Vec3
 */
export function computeCentroid(coords: Vec3[]): Vec3 {
    const centroid = Vec3.zero();
    for (let i = 0; i < coords.length; i++) {
        centroid[0] += coords[i][0];
        centroid[1] += coords[i][1];
        centroid[2] += coords[i][2];
    }
    centroid[0] /= coords.length;
    centroid[1] /= coords.length;
    centroid[2] /= coords.length;
    return centroid;
}

/**
 * Compute the centroid of a set of coordinates.
 * @param coords Array of BigVec3 coordinates.
 * @returns Centroid as Vec3
 */
export function computeBigCentroid(coords: Vec3[]): Vec3 {
    let sumX = new Big(0), sumY = new Big(0), sumZ = new Big(0);
    for (const v of coords) {
        sumX = sumX.plus(v[0]);
        sumY = sumY.plus(v[1]);
        sumZ = sumZ.plus(v[2]);
    }
    const len = new Big(coords.length);
    const centroid = Vec3.zero();
    centroid[0] = sumX.div(len).toNumber();
    centroid[1] = sumY.div(len).toNumber();
    centroid[2] = sumZ.div(len).toNumber();
    return centroid;
}

/**
 * Calculate rotated coordinates given a rotation matrix.
 * @param rotmat The rotation matrix as a flat array of 9 numbers.
 * @param x The x coordinates.
 * @param y The y coordinates.
 * @param z The z coordinates.
 * @returns An object containing the rotated coordinates {xR, yR, zR}.
 */
export function getRotatedCoordinates(rotmat: number[], x: number[], y: number[], z: number[]): { xR: number[]; yR: number[]; zR: number[] } {
    let xR: number[] = [];
    let yR: number[] = [];
    let zR: number[] = [];
    for (let i = 0; i < x.length; i++) {
        xR[i] = rotmat[0] * x[i] + rotmat[1] * y[i] + rotmat[2] * z[i];
        yR[i] = rotmat[3] * x[i] + rotmat[4] * y[i] + rotmat[5] * z[i];
        zR[i] = rotmat[6] * x[i] + rotmat[7] * y[i] + rotmat[8] * z[i];
    }
    return { xR, yR, zR };
}

/**
 * Calculate rotated coordinates given a rotation matrix.
 * @param rotmat The rotation matrix as a flat array of 9 numbers.
 * @param x The x coordinates.
 * @param y The y coordinates.
 * @param z The z coordinates.
 * @returns An object containing the rotated coordinates {xR, yR, zR}.
 */
export function getBigRotatedCoordinates(rotmat: number[], x: number[], y: number[], z: number[]): { xR: number[]; yR: number[]; zR: number[] } {
    let xR: number[] = [];
    let yR: number[] = [];
    let zR: number[] = [];
    for (let i = 0; i < x.length; i++) {
        xR.push(new Big(rotmat[0]).times(x[i])
            .plus(new Big(rotmat[1]).times(y[i]))
            .plus(new Big(rotmat[2]).times(z[i])).toNumber());
        yR.push(new Big(rotmat[3]).times(x[i])
            .plus(new Big(rotmat[4]).times(y[i]))
            .plus(new Big(rotmat[5]).times(z[i])).toNumber());
        zR.push(new Big(rotmat[6]).times(x[i])
            .plus(new Big(rotmat[7]).times(y[i]))
            .plus(new Big(rotmat[8]).times(z[i])).toNumber());
    }
    return { xR, yR, zR };
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
            const centroid: Vec3 = computeBigCentroid(coords);
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
            //console.log(`Selected phosphorus atom indices for alignment: ${selectedIndices}`);
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
            const aligned = getBigRotatedCoordinates(qcprot.rotmat, x, y, z);
            return { alignedX: aligned.xR, alignedY: aligned.yR, alignedZ: aligned.zR };
        } else {
            // Select the newCount closest phosphorus atoms to the centroid.
            const coords: Vec3[] = [];
            for (let i = 0; i < count; i++) {
                const idx = phosphorusIndices[i];
                coords.push(Vec3.create(x[idx], y[idx], z[idx]));
            }
            const centroid = computeBigCentroid(coords);
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
            const aligned = getBigRotatedCoordinates(qcprot.rotmat, x, y, z);
            return { alignedX: aligned.xR, alignedY: aligned.yR, alignedZ: aligned.zR };
        }
    } else {
        const qcprot = new QCProt(newX, newY, newZ, x, y, z);
        const aligned = getBigRotatedCoordinates(qcprot.rotmat, x, y, z);
        return { alignedX: aligned.xR, alignedY: aligned.yR, alignedZ: aligned.zR };
    }
}