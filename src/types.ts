export interface DataRoot {
	imports?: ImportMap;
	actionGroups: { [group: string]: ActionGroup };
}

export interface ActionGroup {
	actions: {
		[action: string]: Action;
	};
	imports?: ImportMap;
}

export interface Action {
	alias?: string;
	payload?: Payload;
}

export interface ImportMap {
	[name: string]: string;
}

export interface Payload {
	[param: string]: string;
}
