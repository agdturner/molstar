/**
 * Copyright (c) 2025-2025 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Andy Turner <agdturner@gmail.com>
 */
import { ChainIdColorThemeParams } from '../../mol-theme/color/chain-id';
import { Color } from '../../mol-util/color';

//export type SimpleData = Record<string, string>;
export type Data = Record<string, string>;

// export interface SimpleData {
//     [key: string]: string;
//     pdb_chain: string;
//     color: string;
// }

// export interface Data {
//     [key: string]: string;
//     pdb_name: string;
//     RP_name: string;
//     color: string;
//     pdb_id: string;
//     pdb_chain: string;
// }

// This function reads a JSON file and returns a promise that resolves to a Map object
// The file is expected to be a JSON file with the following format:
// {pdb_chain: color}
// Where:
// pdb_chain is the name of the PDB chain (e.g. 4ug0_LY)
// color is a hex color code (e.g. #FF0000)
//export async function readJSONFile(file: File): Promise<SimpleData[]> {
export async function readJSONFile(file: File): Promise<Data[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const data = JSON.parse(text);
                //let transformedData: SimpleData[];
                let transformedData: Data[];
                if (Array.isArray(data)) {
                    transformedData = data.map((item: any) => ({
                        pdb_chain: item.pdb_chain,
                        color: item.color
                    }));
                } else {
                    // Handle object format: { "4ug0_LY": "#FF0000", ... }
                    transformedData = Object.entries(data).map(([pdb_chain, color]) => ({
                        pdb_chain,
                        color: color as string
                    }));
                }
                resolve(transformedData);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

export async function handleColorFileInputChange(
    event: React.ChangeEvent<HTMLInputElement>,
    onChange: (colorList: { asym_id: string, color: Color }[]) => void) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
        const colorMap = new Map<string, string>();
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        let data: Data[];
        if (fileExtension === 'json') {
            //let data: SimpleData[] = await readJSONFile(file);
            data = await readJSONFile(file);
        } else {
            data = await readFile(file);
        }
        data.forEach(x => colorMap.set(x.pdb_chain, x.color));
        const colorList = Array.from(colorMap.entries())
            .map(([asym_id, color]) => {
                const colorObj = Color.fromHexStyle(color);
                if (!colorObj) {
                    console.warn(`Invalid color for asym_id ${asym_id}: ${color}`);
                    return null;
                }
                return { asym_id, color: colorObj };
            })
            .filter((item): item is { asym_id: string, color: Color } => item !== null);
        onChange(colorList);
    } catch (error) {
        console.error('Error reading color file:', error);
    }
}

// This function reads a file and returns a promise that resolves to an array of Data objects
// The file is expected to be a text file with the following format:
// pdb_name RP_name class color
// Where:
// pdb_name is the name of the PDB chain (e.g. 4ug0_LY)
// RP_name is the name of the ribosomal protein (e.g. RPL26)
// class is an integer representing the color class (e.g. 1) - this is ignored for now
// color is a hex color code (e.g. #FF0000)
export async function readFile(file: File): Promise<Data[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            console.log('Started parsing file:', file.name);
            const text = event.target?.result as string;
            const lines = text.split('\n');
            const data: Data[] = [];
            if (lines.length > 0) {
                const header = lines[0];
                console.log('Filename:', file.name);
                console.log('Header:', header);
            }
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                console.log(`Parsing line ${i}: ${line}`);
                if (!line) continue;
                const parts = line.split(/\s+/);
                if (parts.length < 4) continue; // skip malformed lines
                const [pdb_name, RP_name, , colorStr] = parts;
                const [pdb_id, pdb_chain] = pdb_name.split('_');
                if (!pdb_id || !pdb_chain) continue; // skip malformed pdb_name
                data.push({
                    pdb_name,
                    RP_name,
                    color: colorStr,
                    pdb_id,
                    pdb_chain
                });
                console.log(`Parsed line ${i}: pdb_name=${pdb_name}, RP_name=${RP_name}, color=${colorStr}, pdb_id=${pdb_id}, pdb_chain=${pdb_chain}`); 
            }
            console.log('Finished parsing file. Total entries:', data.length);
            resolve(data);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

export function saveColorTheme(themeParams: ChainIdColorThemeParams) {
    const output = {
        params: themeParams
    };
    const jsonString = JSON.stringify(output, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'color_theme.json';
    a.click();
    URL.revokeObjectURL(url);
}

export function loadColorTheme(file: File): Promise<ChainIdColorThemeParams> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const json = JSON.parse(text);
            resolve(json.params);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
} 