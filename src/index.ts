// deno-lint-ignore-file no-explicit-any
import { depIO, depStreams } from "../dependencies.ts"
import { isURL, prepareStack, serializeStack } from "./helpers.ts";
import { ILaraCodes, ILaraExceptionObject, ILaraExceptionSettings } from "./types.ts";

export class LaraHandlerException {
    private DEEP_FILE = [30,30];
    protected REPORTS: any[] = []
    protected SETTINGS: ILaraExceptionSettings = {
        debug: false,
        types: {
            console: false,
            object: false,
            file: false
        }
    }

    public setSettings(settings: ILaraExceptionSettings) {
        this.SETTINGS = settings;
    }

    public setDeepFile(deep: number[]) {
        this.DEEP_FILE = deep;
    }

    public report(exception: any) {
        this.REPORTS.push(exception);
    }

    public clearReports() {
        this.REPORTS = [];
    }

    public getReport(index = 0) {
        return this.REPORTS[index];
    }

    public getReports() {
        return this.REPORTS;
    }

    public existsReport() {
        return this.REPORTS.length > 0;
    }

    public removeReport(position: "first" | "last" | number = "first") {
        if (position === "first") {
            this.REPORTS.shift();
        }
        if (position === "last") {
            this.REPORTS.pop();
        }
        if (typeof position === "number") {
            this.REPORTS.splice(position, 1);
        }
    }

    public async traceException(stack: string) {
        const stacks = this.prepareStack(stack);

        for (const stack of stacks) {
            if (stack.paths.system !== "<anonymous>") {
                stacks[stack.id].error.codes = await this.prepareCode(stack);
            }
        }

        return stacks;
    }

    public async console(exception: any, depth = 0) {
        const { name, message, stacks } = await this.prepareException(exception);

        const stack = stacks[depth];

        console.log("%cError: %c" + name + " - " + message, "color: red", "color: white;");
    
        for (const stack of stacks) {
            console.log(`\tat${ stack.error.isClass ? " " + stack.error.isClass + "" : "" }${ stack.error.isAsync ? " " + stack.error.isAsync + " " : "" }${ stack.error.evaluate ? " " + stack.error.evaluate + " " :  " " }%c(${ stack.paths.import })${ stack.paths.import !== "<anonymous>" ? ` %cline ${ stack.error.lineError[0] } column ${ stack.error.lineError[1] }` : "" }`, "color: lightblue;", stack.paths.import !== "<anonymous>" ? "color: yellow;" : "");
        }

        console.log("");
        console.log(`%cCodeError: %c${stack.paths.import}`, "color: red;", "color: lightblue;");

        if (stack.error.codes) {
            for (const { line, code } of stack.error.codes) {
                if (line === stack.error.lineError[0]) {
                    console.log(`\t%c ${line} %c > %c   ${code}`, "color: white; background-color: red", "color: red;", "color: white; font-weight: bold;")
                } else {
                    console.log(`\t%c ${line} %c     ${code}`, "color: black; background-color: white", "color white; background-color: black;")
                }
            }
        }
    }

    public async object(exception: any) {
        return await this.prepareException(exception);
    }

    public async file(exception: any, filepath = "", filename = "error.log") {
        const { name, message, stacks, date } = await this.prepareException(exception);

        if (!filepath) filepath = Deno.cwd() + "\\" + filename;
        else filepath = filepath + "\\" + filename;

        let result = `[${date}] [ERROR] ${name} - ${message}\n[stacktrace]\n`;

        for (const stack of stacks) {
            result = result + `#${stack.id} (${stack.paths.system}${stack.error.lineError.length ? `:${stack.error.lineError[0]}:${stack.error.lineError[1]}` : ""}) ${stack.error.evaluate ?? ""}\n`
        }

        result = result + "\n";

        await Deno.writeTextFile(filepath, result, {
            append: true
        });

        return true;
    }

    public async executeExceptions(exceptions?: any[]) {
        const stacktrace = [];

        if (this.existsReport()) {
            exceptions = exceptions ? exceptions : this.getReports();
        }

        if (!exceptions) return;

        if (!this.SETTINGS.debug) return;

        for (const exception of exceptions) {
            if (!this.validateException(exception)) return;

            if (this.SETTINGS.types?.console) {
                await this.console(exception);
            }
    
            if (this.SETTINGS.types?.object) {
                stacktrace.push(await this.object(exception));
            }
    
            if (this.SETTINGS.types?.file) {
                await this.file(exception);
            }

            if (this.existsReport()) {
                this.removeReport();
            }
        }

        return stacktrace;
    }

    public async executeException(exception?: any) {
        if (this.existsReport()) {
            exception = exception ? exception : this.getReport();
        }

        if (!exception) return;

        if (!this.SETTINGS.debug) return;

        if (!this.validateException(exception)) return;

        if (this.SETTINGS.types?.console) {
            await this.console(exception);
        }

        if (this.SETTINGS.types?.object) {
            return await this.object(exception);
        }

        if (this.SETTINGS.types?.file) {
            await this.file(exception);
        }

        if (this.existsReport()) {
            this.removeReport();
        }
    }

    protected async prepareException(exception: any) {
        const { name, message, stack, cause } = exception;

        const stacks = this.prepareStack(stack)

        const date = new Date();
        
        const formatDate = `${date.getFullYear()}-${date.getMonth()+1 < 10 ? `0${date.getMonth()+1}` : date.getMonth()+1}-${date.getDate() < 10 ? `0${date.getDate()}` : date.getDate()}`;
        const formatTime = `${date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()}:${date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()}:${date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds()}`

        for (const stack of stacks) {
            if (stack.paths.system !== "<anonymous>") {
                stacks[stack.id].error.codes = await this.prepareCode(stack);
            }
        }

        return {
            name,
            message,
            stacks,
            cause,
            date: `${formatDate} ${formatTime}`
        };
    }

    protected validateException(exception: any) {
        return exception instanceof Error;
    }

    protected async prepareCode(stack: ILaraExceptionObject) {
        const codes: ILaraCodes[] = [];
        const [ row ] = stack.error.lineError;

        const linePrevious = row - this.DEEP_FILE[0];
        const lineNext = row + this.DEEP_FILE[1];

        const reader = await this.openFile(stack.paths.system);

        const lines = depIO.readLines(reader);

        let index = 1;

        for await (const line of lines) {
            if (index >= linePrevious && index <= lineNext) {
                codes.push({
                    code: line,
                    line: index
                });
            }

            index++;
        }

        return codes;
    }

    protected prepareStack(stack: string): ILaraExceptionObject[] {
        const stacks: any[] = stack.split("\n");

        stacks.shift();

        const format = stacks
            .map((line: string) => line.trim())
            .map((line: string) => line.split(" "))
            .map(serializeStack)
            .map(prepareStack);

        return format
    }

    protected async openFile(path: string) {
        if (isURL(path)) {
            return depStreams.readerFromStreamReader((await fetch(path)).body!.getReader());
        } else {
            return await Deno.open(path);
        }
    }
}