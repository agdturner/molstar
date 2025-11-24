/**
 * Copyright (c) 2018-2025 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Andy Turner <agdturner@gmail.com>
 */
import { Vec3, Mat4 } from '../../../mol-math/linear-algebra';

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
 * (Placeholder for Kabsch algorithm)
 * @param existing Existing Vec3 array
 * @param incoming Incoming Vec3 array
 * @returns Aligned incoming Vec3 array
 */
export function alignDataset(existing: Vec3[], incoming: Vec3[]): Vec3[] {
    const centroidExisting = computeCentroid(existing);
    const centroidIncoming = computeCentroid(incoming);
    const translation = Vec3.zero();
    Vec3.sub(translation, centroidExisting, centroidIncoming);
    return incoming.map(c => {
        const result = Vec3.zero();
        return Vec3.add(result, c, translation);
    });
}
