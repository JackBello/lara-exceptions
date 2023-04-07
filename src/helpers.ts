import { depPath } from "../dependencies.ts";
import { ILaraExceptionObject } from "./types.ts";

export function isURL (url: string) {
    return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(url);
}

export function serializeStack(lineObject: string[]) {
    lineObject = lineObject.map((stack: string, index: number) => {
        if (index === lineObject.length-1) return stack.replace(/(\(|\))/g, "")
        else return stack;
    })

    if (lineObject[0] === "eval") {
        lineObject.shift();
    }

    lineObject.shift();
    
    return lineObject;
}

export function prepareEval(parts: string[], index: number): ILaraExceptionObject {
    const [ trace, child ] = `${parts.join(" ")})`.replace("eval ", "").slice(1,-1).split(",").map(part => part.trim());

    let evaluateChild = undefined;
    let lineErrorChild = undefined;

    if (child) {
        evaluateChild = child.slice(0, child.search(/:[0-9]+:[0-9]+/g));
        lineErrorChild = child.slice(child.search(/:[0-9]+:[0-9]+/g)+1).split(":").map((number: string) => Number(number));
    }

    const partTrace = [trace.split(" ")].map(serializeStack)[0];

    const stack = prepareStack(partTrace, index);

    stack.error.isEval = "eval"

    stack.child?.push({
        lineError: lineErrorChild,
        evaluate: evaluateChild,
        isEval: "eval"
    })

    return stack;
}

export function prepareStack(parts: string[], index: number): ILaraExceptionObject {
    if (parts[0] === "eval") return prepareEval(parts, index);

    let evaluate = parts[0].search(/(http:\/\/|https:\/\/|file:\/\/\/)/g) === -1 ? parts[0] : undefined;
    let isAsync = undefined;
    let isClass = undefined;

    const fileWithError = parts[parts.length-1];
    const positionError = fileWithError.search(/:[0-9]+:[0-9]+/g);
    const lineError = fileWithError !== "<anonymous>" ? fileWithError.slice(positionError+1).split(":").map((number: string) => Number(number)) : [];

    const importFile = positionError !== -1 ? fileWithError.slice(0, positionError) : "<anonymous>";
    const systemFile = positionError !== -1 ? fileWithError.slice(8, positionError) : "<anonymous>";

    if (evaluate === "new") {
        isClass = evaluate + " " + parts[1];
        evaluate = parts[1] === fileWithError ? undefined : parts[1];
    }
    
    if (evaluate === "async") {
        isAsync = evaluate;
        evaluate = parts[1] === fileWithError ? undefined : parts[1];
    }

    return {
        id: index,
        dirname: fileWithError !== "<anonymous>" ? depPath.dirname(systemFile) : undefined,
        filename: fileWithError !== "<anonymous>" ? depPath.basename(systemFile) : undefined,
        paths: {
            import: importFile,
            system: systemFile,
            original: fileWithError
        },
        error: {
            evaluate,
            lineError,
            isEval: undefined,
            isAsync,
            isClass,
            codes: []
        },
        child: []
    };
}