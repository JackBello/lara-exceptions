import { LaraHandlerException } from "../mod.ts";
import { A } from "./b.ts";

const handlerException = new LaraHandlerException();

handlerException.setSettings({
    debug: true,
    types: {
        console: true
    }
})

try {
    const a = new A()

    await a.b();
    // await a.c();
} catch (error) {
    handlerException.report(error);

    const stacktrace = await handlerException.executeException();

    // console.log(stacktrace);
}