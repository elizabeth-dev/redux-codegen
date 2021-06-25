#!/usr/bin/env node

import {
	readFileSync,
	writeFileSync,
	existsSync,
	lstatSync,
	mkdirSync,
} from 'fs';
import ts from 'typescript';
import {
	genActions,
	genGroupDto,
	genGroupSet,
	genImports,
} from './codeGenerators';
import { DataRoot } from './types';
import { genFileName, recursiveReaddir } from './utils';
import YAML from 'yaml';

const args = process.argv.slice(2);

const { outDir, paths } = args.reduce((acc, el, i, arr) => {
	if (el === '-o' || el === '--outDir')
		return { ...acc, outDir: arr[i + 1]?.replace(/\/$/, '') };

	if (i > 0 && (arr[i - 1] === '-o' || arr[i - 1] === '--outDir')) return acc;

	return { ...acc, paths: [...(acc.paths ?? []), el] };
}, {} as { outDir: string; paths: string[] });

if (!outDir) {
	console.error('No output specified.');
	process.exit(1);
}

if (existsSync(outDir) && !lstatSync(outDir).isDirectory()) {
	console.error('Output must be a directory.');
	process.exit(1);
}

if (!paths || paths.length === 0) {
	console.error('No inputs specified.');
	process.exit(1);
}

const files = paths
	.flatMap((path) => {
		if (!existsSync(path)) {
			console.warn(`File or directory does not exist: ${path}`);
			return [];
		}

		if (!lstatSync(path).isDirectory()) return path;

		return recursiveReaddir(path);
	})
	.filter((file) => {
		if (
			file.endsWith('.json') ||
			file.endsWith('.yaml') ||
			file.endsWith('.yml')
		)
			return true;

		console.info(`Ignoring non-JSON file: ${file}`);
		return false;
	});

for (const file of files) {
	const rawInput = readFileSync(file, 'utf-8');
	const { actionGroups, imports: topImports }: DataRoot = file.endsWith('.json')
		? JSON.parse(rawInput)
		: YAML.parse(rawInput);

	const groupsRes: {
		imports: ts.Node[];
		actions: ts.Node[][];
		groupDto: ts.Node;
		groupSet: ts.Node;
		groupKey: string;
	}[] = Object.entries(actionGroups).map(([groupKey, group]) => {
		const imports = genImports(group, topImports);
		const actions = genActions(groupKey, group.actions);
		const groupDto = genGroupDto(groupKey, group.actions);
		const groupSet = genGroupSet(groupKey, group.actions);

		return { imports, actions, groupDto, groupSet, groupKey };
	});

	for (const group of groupsRes) {
		const filename = `${outDir}/${genFileName(group.groupKey)}`;
		const resultFile = ts.createSourceFile(
			filename,
			'',
			ts.ScriptTarget.Latest,
			false,
			ts.ScriptKind.TS
		);

		const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
		const result =
			[
				group.imports
					.map((node) =>
						printer.printNode(ts.EmitHint.Unspecified, node, resultFile)
					)
					.join('\n'),
				group.actions
					.flat()
					.map((node) =>
						printer.printNode(ts.EmitHint.Unspecified, node, resultFile)
					)
					.join('\n\n'),
				printer.printNode(ts.EmitHint.Unspecified, group.groupDto, resultFile),
				printer.printNode(ts.EmitHint.Unspecified, group.groupSet, resultFile),
			].join('\n\n') + '\n';

		mkdirSync(outDir, { recursive: true });
		writeFileSync(filename, result, {});
	}
}
