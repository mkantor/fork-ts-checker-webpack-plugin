import type * as ts from 'typescript';

import { extensions } from '../extensions';
import { system } from '../system';
import { typescript } from '../typescript';

export function createWatchCompilerHost<TProgram extends ts.BuilderProgram>(
  parsedConfig: ts.ParsedCommandLine,
  createProgram?: ts.CreateProgram<TProgram>,
  reportDiagnostic?: ts.DiagnosticReporter,
  reportWatchStatus?: ts.WatchStatusReporter,
  afterProgramCreate?: (program: TProgram) => void
): ts.WatchCompilerHostOfFilesAndCompilerOptions<TProgram> {
  const baseWatchCompilerHost = typescript.createWatchCompilerHost(
    parsedConfig.fileNames,
    parsedConfig.options,
    system,
    createProgram,
    reportDiagnostic,
    reportWatchStatus,
    parsedConfig.projectReferences
  );

  let controlledWatchCompilerHost: ts.WatchCompilerHostOfFilesAndCompilerOptions<TProgram> = {
    ...baseWatchCompilerHost,
    createProgram(
      rootNames: ReadonlyArray<string> | undefined,
      options: ts.CompilerOptions | undefined,
      compilerHost?: ts.CompilerHost,
      oldProgram?: TProgram,
      configFileParsingDiagnostics?: ReadonlyArray<ts.Diagnostic>,
      projectReferences?: ReadonlyArray<ts.ProjectReference> | undefined
    ): TProgram {
      extensions.forEach((extension) => {
        if (compilerHost && extension.extendCompilerHost) {
          compilerHost = extension.extendCompilerHost(compilerHost, parsedConfig);
        }
      });

      return baseWatchCompilerHost.createProgram(
        rootNames,
        options,
        compilerHost,
        oldProgram,
        configFileParsingDiagnostics,
        projectReferences
      );
    },
    afterProgramCreate(program) {
      if (afterProgramCreate) {
        afterProgramCreate(program);
      }
    },
    onWatchStatusChange(): void {
      // do nothing
    },
    watchFile: system.watchFile,
    watchDirectory: system.watchDirectory,
    setTimeout: system.setTimeout,
    clearTimeout: system.clearTimeout,
    fileExists: system.fileExists,
    readFile: system.readFile,
    directoryExists: system.directoryExists,
    getDirectories: system.getDirectories,
    realpath: system.realpath,
  };

  extensions.forEach((extension) => {
    if (extension.extendWatchCompilerHost) {
      controlledWatchCompilerHost = extension.extendWatchCompilerHost<
        TProgram,
        ts.WatchCompilerHostOfFilesAndCompilerOptions<TProgram>
      >(controlledWatchCompilerHost, parsedConfig);
    }
  });

  return controlledWatchCompilerHost;
}
