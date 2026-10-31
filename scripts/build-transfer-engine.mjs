import {build} from 'esbuild';
import path from 'node:path';
const target=process.argv[2];
if(!target)throw Error('Provide an output directory for the Apps Script bundle');
await build({entryPoints:['src/utils/ledgerTransfers.ts'],bundle:true,platform:'neutral',format:'iife',globalName:'LedgerTransferEngine',target:'es2020',outfile:path.join(target,'TransferEngine.js')});
console.log('Built Apps Script transfer engine.');
