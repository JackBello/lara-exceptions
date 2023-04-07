import { readerFromStreamReader } from "https://deno.land/std@0.182.0/streams/mod.ts";
import { readLines } from "https://deno.land/std@0.182.0/io/mod.ts";
import { dirname, extname, basename } from "https://deno.land/std@0.182.0/path/mod.ts";

export const depStreams = {
    readerFromStreamReader
}

export const depIO = {
    readLines
}

export const depPath = {
    dirname,
    extname,
    basename
}