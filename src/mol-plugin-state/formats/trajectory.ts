/**
 * Copyright (c) 2018-2024 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @author Ludovic Autin <ludovic.autin@gmail.com>
 */

import { StateTransforms } from '../transforms';
import { guessCifVariant, DataFormatProvider } from './provider';
import { StateTransformer, StateObjectRef } from '../../mol-state';
import { PluginStateObject } from '../objects';
import { PluginContext } from '../../mol-plugin/context';
import { Vec3 } from '../../mol-math/linear-algebra';
import { computeCentroid, alignDataset } from '../../extensions/ribocode/utils/geometry';

export interface TrajectoryFormatProvider<P extends { trajectoryTags?: string | string[] } = { trajectoryTags?: string | string[] }, R extends { trajectory: StateObjectRef<PluginStateObject.Molecule.Trajectory> } = { trajectory: StateObjectRef<PluginStateObject.Molecule.Trajectory> }>
    extends DataFormatProvider<P, R> {
}

export const TrajectoryFormatCategory = 'Trajectory';

function defaultVisuals(plugin: PluginContext, data: { trajectory: StateObjectRef<PluginStateObject.Molecule.Trajectory> }) {
    return plugin.builders.structure.hierarchy.applyPreset(data.trajectory, 'default');
}

export interface MmcifParseParams {
    trajectoryTags?: string | string[];
    centraliseCoordinates?: boolean;
    alignmentData?: any;
}

export const MmcifProvider: TrajectoryFormatProvider<MmcifParseParams> = {
    //export const MmcifProvider: MmcifParseParams = {
    label: 'mmCIF',
    description: 'mmCIF',
    category: TrajectoryFormatCategory,
    stringExtensions: ['cif', 'mmcif', 'mcif'],
    binaryExtensions: ['bcif'],
    isApplicable: (info, data) => {
        if (info.ext === 'mmcif' || info.ext === 'mcif') return true;
        // assume undetermined cif/bcif files are mmCIF
        if (info.ext === 'cif' || info.ext === 'bcif') return guessCifVariant(info, data) === -1;
        return false;
    },
    //parse: async (plugin, data, params) => {
    parse: async (plugin, data, params?: MmcifParseParams) => {
        console.log('MmcifProvider.parse called');
        const state = plugin.state.data;
        console.log('Building state tree for data:', data);
        const cif = state.build().to(data)
            .apply(StateTransforms.Data.ParseCif, void 0, { state: { isGhost: true } });
        console.log('cif state built:', cif);
        console.log('Applying TrajectoryFromMmCif transform');
        const trajectory = await cif
            .apply(StateTransforms.Model.TrajectoryFromMmCif, void 0, { tags: params?.trajectoryTags })
            .commit({ revertOnError: true });
        if (params?.centraliseCoordinates || params?.alignmentData) {
            // Step 1: Get the cell from the state using trajectory.ref
            const trajCell = plugin.state.data.cells.get(trajectory.ref);
            // Step 2: Inspect the cell and its data
            console.log('trajCell:', trajCell);
            console.log('trajCell.obj:', trajCell?.obj);
            if (trajCell?.obj?.data) {
                //console.log('trajCell.obj.data:', trajCell?.obj?.data);
                // Inspect the first frame and representative
                const nframes = trajCell.obj.data.frames.length;
                if (nframes === 0) {
                    console.warn('No frames found in trajectory data.');
                    return { trajectory };
                } else if (nframes > 1) {
                    console.warn(`Multiple frames (${nframes}) found in trajectory data. Centralisation/alignment will be applied only to the first frame.`);
                }
                //console.log('Representative:', trajCell.obj.data.representative);
                const frame = trajCell.obj.data.frames[0];
                if (frame) {
                    //console.log('Frame data:', frame);
                    if (frame.atomicConformation && frame.atomicHierarchy) {
                        //console.log('atomicConformation:', frame.atomicConformation);
                        const x = Array.from(frame.atomicConformation.x);
                        const y = Array.from(frame.atomicConformation.y);
                        const z = Array.from(frame.atomicConformation.z);
                        //console.log('atomicHierarchy:', frame.atomicHierarchy);
                        const type_symbol = frame.atomicHierarchy.atoms.type_symbol.__array;
                        //console.log('Atom coordinates and type:', { x, y, z, type_symbol });
                        const n = x.length;
                        const d = Math.floor(n / 10);
                        const newX: Float32Array = new Float32Array(n);
                        const newY: Float32Array = new Float32Array(n);
                        const newZ: Float32Array = new Float32Array(n);
                        if (params?.alignmentData) {
                            // Use alignmentData to align the new coordinates
                            //console.log('Alignment data provided:', params.alignmentData);
                            const alignedCoordinates = alignDataset(type_symbol, Array.from(newX), Array.from(newY), Array.from(newZ), params.alignmentData.type, params.alignmentData.x, params.alignmentData.y, params.alignmentData.z);
                            // Update newX, newY, newZ with aligned coordinates
                            for (let i = 0; i < n; i++) {
                                newX[i] = alignedCoordinates.alignedX[i];
                                newY[i] = alignedCoordinates.alignedY[i];
                                newZ[i] = alignedCoordinates.alignedZ[i];
                                if (i % d === 0) {
                                    console.log(`Aligned coordinates for atom ${i}: (${type_symbol[i]}, ${newX[i]}, ${newY[i]}, ${newZ[i]})`);
                                }
                            }
                            console.log('Coordinates aligned using provided alignment data.');
                        } else {
                            console.log('No alignment data provided.');
                            console.log('Centralising coordinates');
                            // Centralise coordinates logic
                            // 1. Build Vec3 array from x, y, z
                            const coords: Vec3[] = [];
                            for (let i = 0; i < n; i++) {
                                const v = Object.assign([x[i], y[i], z[i]], { '@type': 'vec3' }) as Vec3;
                                coords.push(v);
                                if (i % d === 0) {
                                    console.log(`Atom ${i}: (${type_symbol[i]}, ${v[0]}, ${v[1]}, ${v[2]})`);
                                }
                            }
                            // 2. Compute centroid
                            const centroid: Vec3 = computeCentroid(coords);
                            console.log('Computed centroid:', centroid);
                            // 3. Calculate new coordinates
                            // Subtract centroid from each coordinate
                            for (let i = 0; i < coords.length; i++) {
                                newX[i] = coords[i][0] - centroid[0];
                                newY[i] = coords[i][1] - centroid[1];
                                newZ[i] = coords[i][2] - centroid[2];
                                if (i % d === 0) {
                                    console.log(`Centralised coordinates for atom ${i}: (${type_symbol[i]}, ${newX[i]}, ${newY[i]}, ${newZ[i]})`);
                                }
                            }
                        }
                        // Replace coordinates
                        frame.atomicConformation.x = newX;
                        frame.atomicConformation.y = newY;
                        frame.atomicConformation.z = newZ;
                    } else {
                        // Log all keys to help discover coordinate storage
                        console.log('Frame keys:', Object.keys(frame));
                    }
                } else {
                    console.log('No frame data found.');
                }
            } else {
                console.log('trajCell or trajCell.obj.data is undefined.');
            }
        } else {
            console.log('Centralise coordinates not requested.');
        }
        console.log('TrajectoryFromMmCif applied, trajectory:', trajectory);
        console.log('MmcifProvider.parse completed');
        if ((cif.selector.cell?.obj?.data.blocks.length || 0) > 1) {
            plugin.state.data.updateCellState(cif.ref, { isGhost: false });
        }
        return { trajectory };
    },
    visuals: defaultVisuals
};

export const CifCoreProvider: TrajectoryFormatProvider = {
    label: 'cifCore',
    description: 'CIF Core',
    category: TrajectoryFormatCategory,
    stringExtensions: ['cif'],
    isApplicable: (info, data) => {
        if (info.ext === 'cif') return guessCifVariant(info, data) === 'coreCif';
        return false;
    },
    parse: async (plugin, data, params) => {
        const state = plugin.state.data;
        const cif = state.build().to(data)
            .apply(StateTransforms.Data.ParseCif, void 0, { state: { isGhost: true } });
        const trajectory = await cif
            .apply(StateTransforms.Model.TrajectoryFromCifCore, void 0, { tags: params?.trajectoryTags })
            .commit({ revertOnError: true });

        if ((cif.selector.cell?.obj?.data.blocks.length || 0) > 1) {
            plugin.state.data.updateCellState(cif.ref, { isGhost: false });
        }
        return { trajectory };
    },
    visuals: defaultVisuals
};

function directTrajectory<P extends {}>(transformer: StateTransformer<PluginStateObject.Data.String | PluginStateObject.Data.Binary, PluginStateObject.Molecule.Trajectory, P>, transformerParams?: P): TrajectoryFormatProvider['parse'] {
    return async (plugin, data, params) => {
        const state = plugin.state.data;
        const trajectory = await state.build().to(data)
            .apply(transformer, transformerParams, { tags: params?.trajectoryTags })
            .commit({ revertOnError: true });
        return { trajectory };
    };
}

export const PdbProvider: TrajectoryFormatProvider = {
    label: 'PDB',
    description: 'PDB',
    category: TrajectoryFormatCategory,
    stringExtensions: ['pdb', 'ent'],
    parse: directTrajectory(StateTransforms.Model.TrajectoryFromPDB),
    visuals: defaultVisuals
};

export const PdbqtProvider: TrajectoryFormatProvider = {
    label: 'PDBQT',
    description: 'PDBQT',
    category: TrajectoryFormatCategory,
    stringExtensions: ['pdbqt'],
    parse: directTrajectory(StateTransforms.Model.TrajectoryFromPDB, { isPdbqt: true }),
    visuals: defaultVisuals
};

export const XyzProvider: TrajectoryFormatProvider = {
    label: 'XYZ',
    description: 'XYZ',
    category: TrajectoryFormatCategory,
    stringExtensions: ['xyz'],
    parse: directTrajectory(StateTransforms.Model.TrajectoryFromXYZ),
    visuals: defaultVisuals
};

export const LammpsDataProvider: TrajectoryFormatProvider = {
    label: 'Lammps Data',
    description: 'Lammps Data',
    category: TrajectoryFormatCategory,
    stringExtensions: ['data'],
    parse: directTrajectory(StateTransforms.Model.TrajectoryFromLammpsData),
    visuals: defaultVisuals
};

export const LammpsTrajectoryDataProvider: TrajectoryFormatProvider = {
    label: 'Lammps Trajectory Data',
    description: 'Lammps Trajectory Data',
    category: TrajectoryFormatCategory,
    stringExtensions: ['lammpstrj'],
    parse: directTrajectory(StateTransforms.Model.TrajectoryFromLammpsTrajData),
    visuals: defaultVisuals
};

export const GroProvider: TrajectoryFormatProvider = {
    label: 'GRO',
    description: 'GRO',
    category: TrajectoryFormatCategory,
    stringExtensions: ['gro'],
    binaryExtensions: [],
    parse: directTrajectory(StateTransforms.Model.TrajectoryFromGRO),
    visuals: defaultVisuals
};

export const MolProvider: TrajectoryFormatProvider = {
    label: 'MOL',
    description: 'MOL',
    category: TrajectoryFormatCategory,
    stringExtensions: ['mol'],
    parse: directTrajectory(StateTransforms.Model.TrajectoryFromMOL),
    visuals: defaultVisuals
};

export const SdfProvider: TrajectoryFormatProvider = {
    label: 'SDF',
    description: 'SDF',
    category: TrajectoryFormatCategory,
    stringExtensions: ['sdf', 'sd'],
    parse: directTrajectory(StateTransforms.Model.TrajectoryFromSDF),
    visuals: defaultVisuals
};

export const Mol2Provider: TrajectoryFormatProvider = {
    label: 'MOL2',
    description: 'MOL2',
    category: TrajectoryFormatCategory,
    stringExtensions: ['mol2'],
    parse: directTrajectory(StateTransforms.Model.TrajectoryFromMOL2),
    visuals: defaultVisuals
};

export const BuiltInTrajectoryFormats = [
    ['mmcif', MmcifProvider] as const,
    ['cifCore', CifCoreProvider] as const,
    ['pdb', PdbProvider] as const,
    ['pdbqt', PdbqtProvider] as const,
    ['gro', GroProvider] as const,
    ['xyz', XyzProvider] as const,
    ['lammps_data', LammpsDataProvider] as const,
    ['lammps_traj_data', LammpsTrajectoryDataProvider] as const,
    ['mol', MolProvider] as const,
    ['sdf', SdfProvider] as const,
    ['mol2', Mol2Provider] as const,
] as const;

export type BuiltInTrajectoryFormat = (typeof BuiltInTrajectoryFormats)[number][0]