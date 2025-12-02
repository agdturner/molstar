//import { Viewer } from '../../../apps/viewer';
import { Asset } from '../../../mol-util/assets';
import { PluginUIContext } from '../../../mol-plugin-ui/context';
import { MmcifParseParams, MmcifProvider } from '../../../mol-plugin-state/formats/trajectory';
import { PluginStateObject } from '../../../mol-plugin-state/objects';
import { PluginContext } from '../../../mol-plugin/context';
import { StateObjectRef } from '../../../mol-state';
import { Vec3 } from '../../../mol-math/linear-algebra';

// Function to load a molecule file.
export async function loadMoleculeFileToViewer(
    plugin: PluginUIContext, file: Asset.File, centralise: boolean, alignment?: any) {
    console.log('Loading molecule file into viewer:', file.name);
    const data = await plugin.builders.data.readFile(
        { file, label: file.name },
        { state: { isGhost: true } }
    );
    if (!data) {
        console.error('Failed to read file:', file.name);
        return;
    }
    console.log('File read successfully:', data);
    const myProvider = {
        ...MmcifProvider,
        parse: async (
            plugin: PluginContext,
            data: StateObjectRef<PluginStateObject.Data.String | PluginStateObject.Data.Binary>,
            params: MmcifParseParams | undefined
        ) => MmcifProvider.parse(plugin, data, 
            { ...params, centraliseCoordinates: centralise, alignmentData: alignment })
    };
    const trajectory = await plugin.builders.structure.parseTrajectory(data.data, myProvider);
    const model = await plugin.builders.structure.createModel(trajectory);
    const structure = await plugin.builders.structure.createStructure(model);

    await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default');
    //return {structure};
    const atomCoordinates = await getAtomCoordinates(plugin, trajectory);
    return {structure, atomCoordinates};
}

// Function to load a molecule file.
export async function getAtomCoordinates(plugin: PluginUIContext, trajectory: any) {
    console.log('Extracting atom coordinates from trajectory');
    let x : Vec3[] = [];
    let y : Vec3[] = [];
    let z : Vec3[] = [];
    const trajCell = plugin.state.data.cells.get(trajectory.ref);
    if (trajCell?.obj?.data) {
        const frame = trajCell.obj.data.frames[0];
        if (frame) {
            if (frame.atomicConformation) {
                x = Array.from(frame.atomicConformation.x);
                y = Array.from(frame.atomicConformation.y);
                z = Array.from(frame.atomicConformation.z);
            }
        }
    }
    console.log('Atom coordinates extracted:', x.length, y.length, z.length);
    return {x, y, z};
}

