import { b } from './c.ts';

export class A {
    public async b () {
        const request = await fetch("https://www.google.com");

        const text = await request.text();

        b();

        return text;
    }

    public c() {
        return new Promise(resolve => {
            b()

            resolve(true);
        });
    }
}