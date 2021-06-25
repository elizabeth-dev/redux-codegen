import { camelCase, camelCaseTransformMerge } from 'camel-case';
import { pascalCase, pascalCaseTransformMerge } from 'pascal-case';
import ts from 'typescript';
import { Action, ActionGroup, ImportMap } from './types';
import { genConst, parseOptional } from './utils';

const genActionName = (actionKey: string) =>
	pascalCase(`${actionKey}Action`, {
		transform: pascalCaseTransformMerge,
	});

const genActionDefName = (actionKey: string) =>
	pascalCase(`I${genActionName(actionKey)}`, {
		transform: pascalCaseTransformMerge,
	});

const genActionFnName = (actionKey: string) =>
	camelCase(`${actionKey}Fn`, {
		transform: camelCaseTransformMerge,
	});

const genGroupDtoName = (groupKey: string) =>
	pascalCase(`${groupKey}ActionsDto`, {
		transform: pascalCaseTransformMerge,
	});

const genGroupSetName = (groupKey: string) =>
	pascalCase(`${groupKey}Actions`, {
		transform: pascalCaseTransformMerge,
	});

const genActionId = (
	actionKey: string,
	namespace?: string
): ts.VariableStatement => {
	const prefix = namespace ? `${namespace}/` : '';
	const actionName = genActionName(actionKey);

	return genConst(
		actionName,
		undefined,
		ts.factory.createStringLiteral(prefix + actionName, true),
		true
	);
};

const genActionDef = (
	actionKey: string,
	payloadEntries: [string, string][]
): ts.InterfaceDeclaration => {
	const payloadMembers = payloadEntries.map(([name, type]) =>
		ts.factory.createPropertySignature(
			undefined,
			name,
			undefined,
			ts.factory.createTypeReferenceNode(type)
		)
	);

	return ts.factory.createInterfaceDeclaration(
		undefined,
		[ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
		genActionDefName(actionKey),
		undefined,
		undefined,
		[
			ts.factory.createPropertySignature(
				undefined,
				'type',
				undefined,
				ts.factory.createTypeReferenceNode(`typeof ${genActionName(actionKey)}`) // Check how to generate typeof programatically
			),
			...(payloadEntries.length > 0
				? [
						ts.factory.createPropertySignature(
							undefined,
							'payload',
							undefined,
							ts.factory.createTypeLiteralNode(payloadMembers)
						),
				  ]
				: []),
		]
	);
};

const genActionFn = (
	actionKey: string,
	payloadEntries: [string, string][]
): ts.VariableStatement => {
	const actionFnParams = payloadEntries
		.map(([name, type]) => ({ ...parseOptional(name), type }))
		.sort(({ optional: a }, { optional: b }) => {
			if (a === b) return 0;

			return a ? 1 : -1;
		})
		.map(({ value, optional, type }) =>
			ts.factory.createParameterDeclaration(
				undefined,
				undefined,
				undefined,
				value,
				optional
					? ts.factory.createToken(ts.SyntaxKind.QuestionToken)
					: undefined,
				ts.factory.createTypeReferenceNode(type)
			)
		);
	const actionFnBody = ts.factory.createParenthesizedExpression(
		ts.factory.createObjectLiteralExpression([
			ts.factory.createPropertyAssignment(
				'type',
				ts.factory.createIdentifier(genActionName(actionKey))
			),
			...(payloadEntries.length > 0
				? [
						ts.factory.createPropertyAssignment(
							'payload',
							ts.factory.createObjectLiteralExpression(
								payloadEntries.map(([payloadKey]) =>
									ts.factory.createShorthandPropertyAssignment(
										parseOptional(payloadKey).value
									)
								),
								true
							)
						),
				  ]
				: []),
		])
	);
	const actionFnValue = ts.factory.createArrowFunction(
		undefined,
		undefined,
		actionFnParams,
		ts.factory.createTypeReferenceNode(genActionDefName(actionKey)),
		undefined,
		actionFnBody
	);

	return genConst(genActionFnName(actionKey), undefined, actionFnValue);
};

export const genImports = (
	group: ActionGroup,
	topImports?: ImportMap
): ts.ImportDeclaration[] => {
	const imports = { ...topImports, ...group.imports };

	const importList = Object.values(group.actions)
		.flatMap((el) =>
			el?.payload
				? Object.values(el.payload).map((type) => type.replace(/\[\]$/, ''))
				: []
		)
		.reduce<{ [path: string]: Set<string> }>(
			(acc, el) =>
				imports[el]
					? {
							...acc,
							[imports[el]]: acc[imports[el]]
								? acc[imports[el]].add(el)
								: new Set<string>().add(el),
					  }
					: acc,
			{}
		);

	return Object.keys(importList).map((importPath) =>
		ts.factory.createImportDeclaration(
			undefined,
			undefined,
			ts.factory.createImportClause(
				false,
				undefined,
				ts.factory.createNamedImports(
					[...importList[importPath]].map((importName) =>
						ts.factory.createImportSpecifier(
							undefined,
							ts.factory.createIdentifier(importName)
						)
					)
				)
			),
			ts.factory.createStringLiteral(importPath, true)
		)
	);
};

export const genActions = (
	groupKey: string,
	actions: {
		[action: string]: Action | null;
	}
): ts.Node[][] =>
	Object.entries(actions).map(([actionKey, action]) => {
		const payloadEntries = action?.payload
			? Object.entries(action.payload)
			: [];

		const actionId = genActionId(actionKey, groupKey);
		const actionDef = genActionDef(actionKey, payloadEntries);
		const actionFn = genActionFn(actionKey, payloadEntries);

		return [actionId, actionDef, actionFn];
	});

export const genGroupDto = (
	groupKey: string,
	actions: { [action: string]: Action | null }
): ts.TypeAliasDeclaration => {
	const actionTypes = Object.keys(actions).map((actionKey) =>
		ts.factory.createTypeReferenceNode(genActionDefName(actionKey))
	);

	return ts.factory.createTypeAliasDeclaration(
		undefined,
		[ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
		genGroupDtoName(groupKey),
		undefined,
		ts.factory.createUnionTypeNode(actionTypes)
	);
};

export const genGroupSet = (
	groupKey: string,
	actions: { [action: string]: Action | null }
): ts.VariableStatement =>
	genConst(
		genGroupSetName(groupKey),
		undefined,
		ts.factory.createObjectLiteralExpression(
			Object.entries(actions).map(([actionKey, actionVal]) =>
				ts.factory.createPropertyAssignment(
					actionVal?.alias ?? actionKey,
					ts.factory.createIdentifier(genActionFnName(actionKey))
				)
			),
			true
		),
		true
	);
