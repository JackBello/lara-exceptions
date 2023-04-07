export interface ILaraExceptionSettings {
    debug: boolean;
    types?: {
        console?: boolean;
        object?: boolean;
        file?: boolean;
    };
}

export interface ILaraCodes {
    line: number;
    code: string;
}

export interface ILaraChild {
    evaluate: string | undefined;
    lineError: number[] | undefined;
    isEval: string | undefined;
}

export interface ILaraExceptionObject {
    id: number;
    dirname: string | undefined;
    filename: string | undefined;
    paths: {
        import: string;
        system: string;
        original: string;
    };
    error: {
        evaluate: string | undefined;
        lineError: number[];
        isAsync: string | undefined;
        isClass: string | undefined;
        isEval: string | undefined;
        codes: ILaraCodes[] | undefined;
    };
    child: ILaraChild[] | undefined;
}