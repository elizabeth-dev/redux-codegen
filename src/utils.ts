import ts from 'typescript';

export const genConst = <TKind extends ts.KeywordTypeSyntaxKind>(
	name: string,
	type?: TKind,
	value?: ts.Expression,
	exportable = false
): ts.VariableStatement => {
	return ts.factory.createVariableStatement(
		exportable ? [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)] : [],
		ts.factory.createVariableDeclarationList(
			[
				ts.factory.createVariableDeclaration(
					name,
					undefined,
					type ? ts.factory.createKeywordTypeNode(type) : undefined,
					value
				),
			],
			ts.NodeFlags.Const
		)
	);
};

export const parseOptional = (
	value: string
): { value: string; optional: boolean } =>
	value.endsWith('?')
		? { value: value.slice(0, -1), optional: true }
		: { value, optional: false };

export const genFileName = (groupKey: string): string =>
	`${groupKey}.actions.ts`;
