import { readFileSync, writeFileSync } from 'fs';
import ts from 'typescript';
import {
	genActions,
	genGroupDto,
	genGroupSet,
	genImports,
} from './codeGenerators';
import { DataRoot } from './types';
import { genFileName } from './utils';

const rawInput = readFileSync('test.json', 'utf-8');
const { actionGroups, imports: topImports }: DataRoot = JSON.parse(rawInput);

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
	const filename = genFileName(group.groupKey);
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

	writeFileSync(filename, result);
}
