import type { LocalContext } from "./context";
import { scaffoldProject } from "./generators/main";
import { allLocales } from '@faker-js/faker';

interface CommandFlags {
    readonly outDir: string;
    readonly locale?: keyof typeof allLocales;
}

export default async function (this: LocalContext, flags: CommandFlags, inputDir: string): Promise<void> {
    const { project, createFactoryFunction } = scaffoldProject({ locale: flags.locale ?? 'en', inputDir, outDir: flags.outDir })
    const files = project.getSourceFiles();
    const results = await Promise.allSettled(files.map(file => createFactoryFunction(file)))
    const errorResults = results.filter(r => r.status === 'rejected')

    errorResults.forEach(errorResult => {
        console.log(errorResult.reason);
    })

    await project.save()
}
