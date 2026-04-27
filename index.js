#!/usr/bin/env node

const {
  COLORS,
  STRINGS,
  createPrompt,
  printHelp,
  runConfigMenu,
  selectLanguage,
  startSpinner,
  printConfigWarnings,
  printSummary,
  printPointerDetails,
  printValidationIssues,
  printValidationWarnings,
  printCommitMessage,
} = require('./src/ui');
const { parseCliArgs } = require('./src/cli');
const { loadConfig } = require('./src/config');
const {
  loadGlobalSettings,
  resetGlobalLanguage,
  setGlobalLanguage,
} = require('./src/global-config');
const {
  getGitRoot,
  getBranchPointerStatus,
  isSyncBlocked,
  stageAllChanges,
  getStagedSnapshot,
  getStagedSummary,
  collectStagedDiffContext,
  getRecentHistory,
  getBranchContext,
} = require('./src/git');
const {
  ensureGeminiInstalled,
  buildPrompt,
  generateCommitMessage,
  classifyGeminiError,
  validateCommitMessage,
} = require('./src/ai');
const { editInEditor, commitWithMessage } = require('./src/commit');
const { notifyComplete } = require('./src/notifier');
const { version: packageVersion } = require('./package.json');

function printSyncBlockReason(sync, t, colors, consoleRef, printPointerDetailsImpl) {
  if (sync.status === 'behind') {
    consoleRef.error(`${colors.red}${t.syncBehind}${colors.reset}`);
  } else if (sync.status === 'diverged') {
    consoleRef.error(`${colors.red}${t.syncDiverged}${colors.reset}`);
  } else {
    consoleRef.error(`${colors.red}${t.syncDetached}${colors.reset}`);
  }

  printPointerDetailsImpl(sync, t, colors.yellow);
  consoleRef.error(`${colors.yellow}${t.syncHint}${colors.reset}`);
}

function printSyncStatus(sync, t, colors, consoleRef) {
  if (!sync) {
    return;
  }

  if (sync.fetchError) {
    consoleRef.log(`${colors.yellow}${t.syncFetchWarn}${colors.reset}`);
  }

  if (sync.status === 'no-upstream') {
    consoleRef.log(`${colors.yellow}${t.syncNoUpstream}${colors.reset}`);
  } else if (sync.status === 'ahead') {
    consoleRef.log(`${colors.yellow}${t.syncAhead} ${sync.ahead} ${t.syncAheadSuffix}${colors.reset}`);
  } else if (sync.status === 'up-to-date') {
    consoleRef.log(`${colors.green}${t.syncOk}${colors.reset}`);
  }
}

async function run(selectedLang = null, overrides = {}) {
  const colors = overrides.COLORS || COLORS;
  const strings = overrides.STRINGS || STRINGS;
  const createPromptImpl = overrides.createPrompt || createPrompt;
  const selectLanguageImpl = overrides.selectLanguage || selectLanguage;
  const startSpinnerImpl = overrides.startSpinner || startSpinner;
  const printConfigWarningsImpl = overrides.printConfigWarnings || printConfigWarnings;
  const printSummaryImpl = overrides.printSummary || printSummary;
  const printPointerDetailsImpl = overrides.printPointerDetails || printPointerDetails;
  const printValidationIssuesImpl = overrides.printValidationIssues || printValidationIssues;
  const printValidationWarningsImpl = overrides.printValidationWarnings || printValidationWarnings;
  const printCommitMessageImpl = overrides.printCommitMessage || printCommitMessage;
  const loadConfigImpl = overrides.loadConfig || loadConfig;
  const getGitRootImpl = overrides.getGitRoot || getGitRoot;
  const getBranchPointerStatusImpl = overrides.getBranchPointerStatus || getBranchPointerStatus;
  const isSyncBlockedImpl = overrides.isSyncBlocked || isSyncBlocked;
  const stageAllChangesImpl = overrides.stageAllChanges || stageAllChanges;
  const getStagedSnapshotImpl = overrides.getStagedSnapshot || getStagedSnapshot;
  const getStagedSummaryImpl = overrides.getStagedSummary || getStagedSummary;
  const collectStagedDiffContextImpl = overrides.collectStagedDiffContext || collectStagedDiffContext;
  const getRecentHistoryImpl = overrides.getRecentHistory || getRecentHistory;
  const getBranchContextImpl = overrides.getBranchContext || getBranchContext;
  const ensureGeminiInstalledImpl = overrides.ensureGeminiInstalled || ensureGeminiInstalled;
  const buildPromptImpl = overrides.buildPrompt || buildPrompt;
  const generateCommitMessageImpl = overrides.generateCommitMessage || generateCommitMessage;
  const classifyGeminiErrorImpl = overrides.classifyGeminiError || classifyGeminiError;
  const validateCommitMessageImpl = overrides.validateCommitMessage || validateCommitMessage;
  const editInEditorImpl = overrides.editInEditor || editInEditor;
  const commitWithMessageImpl = overrides.commitWithMessage || commitWithMessage;
  const notifyCompleteImpl = overrides.notifyComplete || notifyComplete;
  const consoleRef = overrides.console || console;
  const processRef = overrides.process || process;
  const showConfigHint = Boolean(overrides.showConfigHint);

  const promptControl = createPromptImpl();
  const cwd = typeof processRef.cwd === 'function' ? processRef.cwd() : process.cwd();
  let t = strings.en;

  const collectAnalysisState = async (gitRoot, config) => {
    if (config.autoStage) {
      await stageAllChangesImpl(gitRoot);
    }

    const [summary, diffContext, history, branchContext, stagedSnapshot] = await Promise.all([
      getStagedSummaryImpl(gitRoot),
      collectStagedDiffContextImpl(gitRoot),
      getRecentHistoryImpl(gitRoot, config.historyCount),
      getBranchContextImpl(gitRoot),
      getStagedSnapshotImpl(gitRoot),
    ]);

    return {
      summary,
      diffContext,
      history,
      branchContext,
      stagedSnapshot,
    };
  };

  const hasStagedChangesChanged = async (gitRoot, analysisState) => {
    const currentSnapshot = await getStagedSnapshotImpl(gitRoot);
    return currentSnapshot !== analysisState.stagedSnapshot;
  };

  try {
    const lang = selectedLang || await selectLanguageImpl(promptControl.question, {
      consoleRef,
      showConfigHint,
    });
    t = strings[lang];

    consoleRef.log(`${colors.magenta}${t.starting}${colors.reset}`);

    const step2 = startSpinnerImpl(t.step2);

    let gitRoot;
    try {
      gitRoot = await getGitRootImpl(cwd);
    } catch (error) {
      step2.stop('❌', colors.red);
      consoleRef.error(`${colors.red}${t.errNotGit}${colors.reset}`);
      processRef.exitCode = 1;
      return;
    }

    try {
      await ensureGeminiInstalledImpl(gitRoot);
    } catch (error) {
      step2.stop('❌', colors.red);
      consoleRef.error(`${colors.red}${t.errNotInstalled}${colors.reset}`);
      processRef.exitCode = 1;
      return;
    }

    const { config, warnings } = loadConfigImpl(gitRoot, t);

    let preflightSync = null;
    if (config.strictBranchCheck) {
      step2.update(t.step2Sync);
      preflightSync = await getBranchPointerStatusImpl(gitRoot, {
        fetchBeforeSyncCheck: config.fetchBeforeSyncCheck,
      });

      if (isSyncBlockedImpl(preflightSync.status)) {
        step2.stop('❌', colors.red);
        printSyncBlockReason(preflightSync, t, colors, consoleRef, printPointerDetailsImpl);
        processRef.exitCode = 1;
        return;
      }
    }

    step2.update(config.autoStage ? t.step2AutoStage : t.step2UsingStaged);

    let analysisState = await collectAnalysisState(gitRoot, config);
    const { summary } = analysisState;

    if (summary.total === 0) {
      step2.stop('⚠', colors.yellow);
      consoleRef.log(`${colors.yellow}${t.noChanges}${colors.reset}`);
      return;
    }

    step2.stop();
    printConfigWarningsImpl(warnings, t);

    if (config.strictBranchCheck) {
      printSyncStatus(preflightSync, t, colors, consoleRef);
    } else {
      consoleRef.log(`${colors.yellow}${t.syncCheckDisabled}${colors.reset}`);
    }

    consoleRef.log(config.autoStage
      ? `${colors.yellow}${t.autoStageNotice}${colors.reset}`
      : `${colors.green}${t.stagedOnlyNotice}${colors.reset}`);

    printSummaryImpl(summary, t);

    consoleRef.log(`${colors.cyan}${t.step3}${colors.reset}`);
    const userContext = await promptControl.question('> ');

    const buildPromptFromState = (state) => buildPromptImpl({
      t,
      history: state.history,
      userContext,
      diff: state.diffContext.diff,
      diffTruncated: state.diffContext.truncated,
      branchContext: state.branchContext,
      files: state.diffContext.files,
    });

    const generateCandidate = async (prompt) => {
      consoleRef.log('');
      const step4 = startSpinnerImpl(t.step4);
      const startTime = Date.now();

      try {
        const result = await generateCommitMessageImpl({
          cwd: gitRoot,
          prompt,
          maxAttempts: 2,
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        step4.update(`${t.analysisDone} ${duration}s`);
        step4.stop();
        notifyCompleteImpl(config);

        if (result.attempts > 1) {
          consoleRef.log(`${colors.yellow}${t.validationRetrying}${colors.reset}`);
        }

        printCommitMessageImpl(result.message);
        if (result.warnings.length > 0) {
          consoleRef.log(`${colors.yellow}${t.validationWarnings}${colors.reset}`);
          printValidationWarningsImpl(result.warnings, t);
        }
        if (!result.valid) {
          consoleRef.log(`${colors.yellow}${t.validationFailed}${colors.reset}`);
          printValidationIssuesImpl(result.blockingIssues, t);
          consoleRef.log(`${colors.yellow}${t.validationNeedsAction}${colors.reset}`);
        }

        return result;
      } catch (error) {
        step4.stop('❌', colors.red);
        const errorType = classifyGeminiErrorImpl(error);
        if (errorType === 'auth') {
          consoleRef.error(`${colors.red}${t.errNotAuthenticated}${colors.reset}`);
        } else {
          consoleRef.error(`${colors.red}${t.errGeminiFailed}${colors.reset}`);
          if (error.stderr) {
            consoleRef.error(`${colors.red}${error.stderr.trim()}${colors.reset}`);
          }
        }

        processRef.exitCode = 1;
        return null;
      }
    };

    let generated = await generateCandidate(buildPromptFromState(analysisState));
    if (!generated) {
      return;
    }

    while (true) {
      consoleRef.log(`${colors.cyan}${t.menuTitle}${colors.reset}`);
      consoleRef.log(`1) ${t.menuCommit}`);
      consoleRef.log(`2) ${t.menuRegen}`);
      consoleRef.log(`3) ${t.menuEdit}`);
      consoleRef.log(`4) ${t.menuCancel}`);

      const choice = await promptControl.question(t.selection);

      switch (choice) {
        case '1': {
          if (!generated.valid) {
            consoleRef.log(`${colors.red}${t.validationNeedsAction}${colors.reset}`);
            printValidationIssuesImpl(generated.blockingIssues, t);
            break;
          }

          if (config.strictBranchCheck) {
            const syncBeforeCommit = await getBranchPointerStatusImpl(gitRoot, {
              fetchBeforeSyncCheck: config.fetchBeforeSyncCheck,
            });
            if (isSyncBlockedImpl(syncBeforeCommit.status)) {
              consoleRef.log(`${colors.red}${t.syncBlockedAtCommit}${colors.reset}`);
              printSyncBlockReason(syncBeforeCommit, t, colors, consoleRef, printPointerDetailsImpl);
              break;
            }
          }

          if (await hasStagedChangesChanged(gitRoot, analysisState)) {
            consoleRef.log(`${colors.red}${t.stagedChangedAtCommit}${colors.reset}`);
            consoleRef.log(`${colors.yellow}${t.stagedChangedHint}${colors.reset}`);
            consoleRef.log(`${colors.yellow}${t.stagedChangedNeedsRegenerate}${colors.reset}`);
            break;
          }

          await commitWithMessageImpl(gitRoot, generated.message);
          consoleRef.log(`${colors.green}${t.success}${colors.reset}`);
          return;
        }

        case '2':
          consoleRef.log(`${colors.yellow}${t.regenerating}${colors.reset}`);
          {
            if (config.strictBranchCheck) {
              const syncBeforeRegenerate = await getBranchPointerStatusImpl(gitRoot, {
                fetchBeforeSyncCheck: config.fetchBeforeSyncCheck,
              });
              if (isSyncBlockedImpl(syncBeforeRegenerate.status)) {
                consoleRef.log(`${colors.red}${t.syncBlockedAtRegenerate}${colors.reset}`);
                printSyncBlockReason(syncBeforeRegenerate, t, colors, consoleRef, printPointerDetailsImpl);
                break;
              }
            }

            const refreshedState = await collectAnalysisState(gitRoot, config);
            if (refreshedState.summary.total === 0) {
              consoleRef.log(`${colors.yellow}${t.noChanges}${colors.reset}`);
              break;
            }

            const regenerated = await generateCandidate(buildPromptFromState(refreshedState));
            if (!regenerated) {
              return;
            }

            analysisState = refreshedState;
            printSummaryImpl(refreshedState.summary, t);
            generated = regenerated;
          }
          break;

        case '3': {
          const editResult = await editInEditorImpl(generated.message, promptControl);

          if (editResult.status === 'unchanged') {
            consoleRef.log(`${colors.yellow}${t.editAborted}${colors.reset}`);
            break;
          }

          if (editResult.status === 'editor-failed') {
            consoleRef.log(`${colors.red}${t.editFailed}${colors.reset}`);
            if (editResult.error) {
              consoleRef.log(`${colors.yellow}${editResult.error}${colors.reset}`);
            }
            break;
          }

          const editedValidation = validateCommitMessageImpl(editResult.message);
          if (!editedValidation.valid) {
            consoleRef.log(`${colors.yellow}${t.validationFailed}${colors.reset}`);
            printValidationIssuesImpl(editedValidation.blockingIssues, t);
            consoleRef.log(`${colors.yellow}${t.validationNeedsAction}${colors.reset}`);
            break;
          }

          if (editedValidation.warnings.length > 0) {
            consoleRef.log(`${colors.yellow}${t.validationWarnings}${colors.reset}`);
            printValidationWarningsImpl(editedValidation.warnings, t);
          }

          if (config.strictBranchCheck) {
            const syncBeforeCommit = await getBranchPointerStatusImpl(gitRoot, {
              fetchBeforeSyncCheck: config.fetchBeforeSyncCheck,
            });
            if (isSyncBlockedImpl(syncBeforeCommit.status)) {
              consoleRef.log(`${colors.red}${t.syncBlockedAtCommit}${colors.reset}`);
              printSyncBlockReason(syncBeforeCommit, t, colors, consoleRef, printPointerDetailsImpl);
              break;
            }
          }

          if (await hasStagedChangesChanged(gitRoot, analysisState)) {
            consoleRef.log(`${colors.red}${t.stagedChangedAtCommit}${colors.reset}`);
            consoleRef.log(`${colors.yellow}${t.stagedChangedHint}${colors.reset}`);
            consoleRef.log(`${colors.yellow}${t.stagedChangedNeedsRegenerate}${colors.reset}`);
            break;
          }

          await commitWithMessageImpl(gitRoot, editedValidation.message);
          consoleRef.log(`${colors.green}${t.successEdited}${colors.reset}`);
          return;
        }

        case '4':
          consoleRef.log(`${colors.red}${t.cancelled}${colors.reset}`);
          return;

        default:
          consoleRef.log(`${colors.red}${t.invalid}${colors.reset}`);
      }
    }
  } catch (error) {
    consoleRef.error(`${colors.red}${t.error}${colors.reset} ${error.message}`);
    processRef.exitCode = 1;
  } finally {
    promptControl.close();
  }
}

async function execute(argv = process.argv.slice(2), overrides = {}) {
  const parseCliArgsImpl = overrides.parseCliArgs || parseCliArgs;
  const printHelpImpl = overrides.printHelp || printHelp;
  const packageVersionImpl = overrides.packageVersion ?? packageVersion;
  const runConfigMenuImpl = overrides.runConfigMenu || runConfigMenu;
  const createPromptImpl = overrides.createPrompt || createPrompt;
  const loadGlobalSettingsImpl = overrides.loadGlobalSettings || loadGlobalSettings;
  const setGlobalLanguageImpl = overrides.setGlobalLanguage || setGlobalLanguage;
  const resetGlobalLanguageImpl = overrides.resetGlobalLanguage || resetGlobalLanguage;
  const consoleRef = overrides.console || console;
  const processRef = overrides.process || process;

  const parsedArgs = parseCliArgsImpl(argv);
  if (parsedArgs.command === 'invalid') {
    consoleRef.error(parsedArgs.error);
    printHelpImpl(consoleRef);
    processRef.exitCode = 1;
    return;
  }

  if (parsedArgs.command === 'help') {
    printHelpImpl(consoleRef);
    return;
  }

  if (parsedArgs.command === 'version') {
    consoleRef.log(packageVersionImpl);
    return;
  }

  if (parsedArgs.command === 'config') {
    const promptControl = createPromptImpl();

    try {
      await runConfigMenuImpl({
        question: promptControl.question,
        consoleRef,
        onSetLanguage: async (language) => {
          await setGlobalLanguageImpl(language, { homeDir: overrides.homeDir });
        },
        onResetLanguage: async () => {
          await resetGlobalLanguageImpl({ homeDir: overrides.homeDir });
        },
      });
    } catch (error) {
      consoleRef.error(`Error: ${error.message}`);
      processRef.exitCode = 1;
    } finally {
      promptControl.close();
    }

    return;
  }

  const globalSettings = loadGlobalSettingsImpl({ homeDir: overrides.homeDir });
  const selectedLang = globalSettings.settings.language || null;

  await run(selectedLang, {
    ...overrides,
    showConfigHint: !selectedLang,
  });
}

if (require.main === module) {
  execute(process.argv.slice(2));
}

module.exports = {
  execute,
  run,
};
