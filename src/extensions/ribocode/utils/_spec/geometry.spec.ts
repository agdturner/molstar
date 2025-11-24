/**
 * Copyright (c) 2018-2025 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Andy Turner <agdturner@gmail.com>
 */
import { Vec3, Mat4 } from '../../../../mol-math/linear-algebra';
import { CoordinateTransformer, computeCentroid } from '../geometry';

describe('CoordinateTransformer', () => {
    let transformer: CoordinateTransformer;
    let originalCoordinates: Vec3[];

    beforeEach(() => {
        originalCoordinates = [Vec3.create(1, 2, 3), Vec3.create(4, 5, 6)];
        transformer = new CoordinateTransformer(originalCoordinates);
    });

    test('centralizes coordinates on construction', () => {
        const centroid = computeCentroid(originalCoordinates);
        const expected = originalCoordinates.map(c => {
            const result = Vec3.zero();
            return Vec3.sub(result, c, centroid);
        });
        expect(transformer.getTransformedCoordinates()).toEqual(expected);
    });

    test('translate applies translation vector', () => {
        transformer.translate(Vec3.create(10, 0, 0));
        const centroid = computeCentroid(originalCoordinates);
        const expected = originalCoordinates.map(c => {
            const result = Vec3.zero();
            Vec3.sub(result, c, centroid);
            return Vec3.add(result, result, Vec3.create(10, 0, 0));
        });
        expect(transformer.getTransformedCoordinates()).toEqual(expected);
    });

    test('rotate applies rotation matrix', () => {
        // Identity rotation should not change coordinates
        const before = transformer.getTransformedCoordinates().map(c => Vec3.clone(c));
        transformer.rotate(Mat4.identity());
        expect(transformer.getTransformedCoordinates()).toEqual(before);
    });
});

describe('computeCentroid', () => {
    test('computes centroid of given coordinates', () => {
        const coords = [Vec3.create(1, 2, 3), Vec3.create(4, 5, 6), Vec3.create(7, 8, 9)];
        const centroid = computeCentroid(coords);
        expect(centroid).toEqual(Vec3.create(4, 5, 6));
    });
});