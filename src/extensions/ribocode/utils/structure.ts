//import { Viewer } from '../../../apps/viewer';
import { Asset } from '../../../mol-util/assets';
import { PluginUIContext } from '../../../mol-plugin-ui/context';
import { MmcifParseParams, MmcifProvider } from '../../../mol-plugin-state/formats/trajectory';
import { PluginStateObject } from '../../../mol-plugin-state/objects';
import { PluginContext } from '../../../mol-plugin/context';
import { StateObjectRef } from '../../../mol-state';
import { Vec3 } from '../../../mol-math/linear-algebra';
//import { ElementSymbol } from '../../../mol-model/structure/model/types';

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
    const alignmentData = await getAlignmentData(plugin, trajectory);
    return {structure, alignmentData};
}

// Function to get alignment data for a molecule. This currently includes the type and location of all atoms in the structure.
export async function getAlignmentData(plugin: PluginUIContext, trajectory: any) {
    console.log('Extracting alignment data');
    //let id : string[] = [];
    let x : Vec3[] = [];
    let y : Vec3[] = [];
    let z : Vec3[] = [];
    let type : string[] = [];
    const trajCell = plugin.state.data.cells.get(trajectory.ref);
    if (trajCell?.obj?.data) {
        const frame = trajCell.obj.data.frames[0];
        console.log('Frame data:', frame);
        // if (frame?.atomicHierarchy?.atoms?.id?.__array) {
        //     id = frame.atomicHierarchy.atoms.id.__array as string[];
        // }
        if (frame?.atomicConformation?.x) {
            x = Array.from(frame.atomicConformation.x);
        }
        if (frame?.atomicConformation?.y) {
            y = Array.from(frame.atomicConformation.y);
        }
        if (frame?.atomicConformation?.z) {
            z = Array.from(frame.atomicConformation.z);
        }
        if (frame?.atomicHierarchy?.atoms?.type_symbol?.__array) {
            type = frame.atomicHierarchy.atoms.type_symbol.__array as string[];
        }        
    }
    //console.log('Alignment data extracted:', id.length, x.length, y.length, z.length, type.length);
    //return {id, x, y, z, type};
    console.log('Alignment data extracted:', x.length, y.length, z.length, type.length);
    return {x, y, z, type};
}