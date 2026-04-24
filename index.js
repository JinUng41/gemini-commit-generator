#!/usr/bin/env node

const {
  COLORS,
  STRINGS,
  createPrompt,
  selectLanguage,
  startSpinner,
  printConfigWarnings,
  printSummary,
  printPointerDetails,
  printValidationIssues,
  printValidationWarnings,
  printCommitMessage,
} = require('./src/ui');
const { loadConfig } = require('./src/config');
const {
  getGitRoot,
  getBranchPointerStatus,
  isSyncBlocked,
  stageAllChanges,
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

function printSyncBlockReason(sync, t) {
  if (sync.status === 'behind') {
    console.error(`${COLORS.red}${t.syncBehind}${COLORS.reset}`);
  } else if (sync.status === 'diverged') {
    console.error(`${COLORS.red}${t.syncDiverged}${COLORS.reset}`);
  } else {
    console.error(`${COLORS.red}${t.syncDetached}${COLORS.reset}`);
  }

  printPointerDetails(sync, t, COLORS.yellow);
  console.error(`${COLORS.yellow}${t.syncHint}${COLORS.reset}`);
}

function printSyncStatus(sync, t) {
  if (!sync) {
    return;
  }

  if (sync.fetchError) {
    console.log(`${COLORS.yellow}${t.syncFetchWarn}${COLORS.reset}`);
  }

  if (sync.status === 'no-upstream') {
    console.log(`${COLORS.yellow}${t.syncNoUpstream}${COLORS.reset}`);
  } else if (sync.status === 'ahead') {
    console.log(`${COLORS.yellow}${t.syncAhead} ${sync.ahead} ${t.syncAheadSuffix}${COLORS.reset}`);
  } else if (sync.status === 'up-to-date') {
    console.log(`${COLORS.green}${t.syncOk}${COLORS.reset}`);
  }
}

async function run(selectedLang = null) {
  const promptControl = createPrompt();
  let t = STRINGS.en;

  try {
    const lang = selectedLang || await selectLanguage(promptControl.question);
    t = STRINGS[lang];

    console.log(`${COLORS.magenta}${t.starting}${COLORS.reset}`);

    const step2 = startSpinner(t.step2);

    let gitRoot;
    try {
      gitRoot = await getGitRoot(process.cwd());
    } catch (error) {
      step2.stop('❌', COLORS.red);
      console.error(`${COLORS.red}${t.errNotGit}${COLORS.reset}`);
      process.exitCode = 1;
      return;
    }

    try {
      await ensureGeminiInstalled(gitRoot);
    } catch (error) {
      step2.stop('❌', COLORS.red);
      console.error(`${COLORS.red}${t.errNotInstalled}${COLORS.reset}`);
      process.exitCode = 1;
      return;
    }

    const { config, warnings } = loadConfig(gitRoot, t);

    let preflightSync = null;
    if (config.strictBranchCheck) {
      step2.update(t.step2Sync);
      preflightSync = await getBranchPointerStatus(gitRoot, {
        fetchBeforeSyncCheck: config.fetchBeforeSyncCheck,
      });

      if (isSyncBlocked(preflightSync.status)) {
        step2.stop('❌', COLORS.red);
        printSyncBlockReason(preflightSync, t);
        process.exitCode = 1;
        return;
      }
    }

    step2.update(config.autoStage ? t.step2AutoStage : t.step2UsingStaged);

    const collectAnalysisState = async () => {
      if (config.autoStage) {
        await stageAllChanges(gitRoot);
      }

      const [summary, diffContext, history, branchContext] = await Promise.all([
        getStagedSummary(gitRoot),
        collectStagedDiffContext(gitRoot),
        getRecentHistory(gitRoot, config.historyCount),
        getBranchContext(gitRoot),
      ]);

      return { summary, diffContext, history, branchContext };
    };

    const initialState = await collectAnalysisState();
    const { summary } = initialState;

    if (summary.total === 0) {
      step2.stop('⚠', COLORS.yellow);
      console.log(`${COLORS.yellow}${t.noChanges}${COLORS.reset}`);
      return;
    }

    step2.stop();
    printConfigWarnings(warnings, t);

    if (config.strictBranchCheck) {
      printSyncStatus(preflightSync, t);
    } else {
      console.log(`${COLORS.yellow}${t.syncCheckDisabled}${COLORS.reset}`);
    }

    console.log(config.autoStage
      ? `${COLORS.yellow}${t.autoStageNotice}${COLORS.reset}`
      : `${COLORS.green}${t.stagedOnlyNotice}${COLORS.reset}`);

    printSummary(summary, t);

    console.log(`${COLORS.cyan}${t.step3}${COLORS.reset}`);
    const userContext = await promptControl.question('> ');

    const buildPromptFromState = (state) => buildPrompt({
      t,
      history: state.history,
      userContext,
      diff: state.diffContext.diff,
      diffTruncated: state.diffContext.truncated,
      branchContext: state.branchContext,
      files: state.diffContext.files,
    });

    const generateCandidate = async (prompt) => {
      console.log('');
      const step4 = startSpinner(t.step4);
      const startTime = Date.now();

      try {
        const result = await generateCommitMessage({
          cwd: gitRoot,
          prompt,
          maxAttempts: 2,
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        step4.update(`${t.analysisDone} ${duration}s`);
        step4.stop();
        notifyComplete(config);

        if (result.attempts > 1) {
          console.log(`${COLORS.yellow}${t.validationRetrying}${COLORS.reset}`);
        }

        printCommitMessage(result.message);
        if (result.warnings.length > 0) {
          console.log(`${COLORS.yellow}${t.validationWarnings}${COLORS.reset}`);
          printValidationWarnings(result.warnings, t);
        }
        if (!result.valid) {
          console.log(`${COLORS.yellow}${t.validationFailed}${COLORS.reset}`);
          printValidationIssues(result.blockingIssues, t);
          console.log(`${COLORS.yellow}${t.validationNeedsAction}${COLORS.reset}`);
        }

        return result;
      } catch (error) {
        step4.stop('❌', COLORS.red);
        const errorType = classifyGeminiError(error);
        if (errorType === 'auth') {
          console.error(`${COLORS.red}${t.errNotAuthenticated}${COLORS.reset}`);
        } else {
          console.error(`${COLORS.red}${t.errGeminiFailed}${COLORS.reset}`);
          if (error.stderr) {
            console.error(`${COLORS.red}${error.stderr.trim()}${COLORS.reset}`);
          }
        }

        process.exitCode = 1;
        return null;
      }
    };

    let generated = await generateCandidate(buildPromptFromState(initialState));
    if (!generated) {
      return;
    }

    while (true) {
      console.log(`${COLORS.cyan}${t.menuTitle}${COLORS.reset}`);
      console.log(`1) ${t.menuCommit}`);
      console.log(`2) ${t.menuRegen}`);
      console.log(`3) ${t.menuEdit}`);
      console.log(`4) ${t.menuCancel}`);

      const choice = await promptControl.question(t.selection);

      switch (choice) {
        case '1': {
          if (!generated.valid) {
            console.log(`${COLORS.red}${t.validationNeedsAction}${COLORS.reset}`);
            printValidationIssues(generated.blockingIssues, t);
            break;
          }

          if (config.strictBranchCheck) {
            const syncBeforeCommit = await getBranchPointerStatus(gitRoot, {
              fetchBeforeSyncCheck: config.fetchBeforeSyncCheck,
            });
            if (isSyncBlocked(syncBeforeCommit.status)) {
              console.log(`${COLORS.red}${t.syncBlockedAtCommit}${COLORS.reset}`);
              printSyncBlockReason(syncBeforeCommit, t);
              break;
            }
          }

          await commitWithMessage(gitRoot, generated.message);
          console.log(`${COLORS.green}${t.success}${COLORS.reset}`);
          return;
        }

        case '2':
          console.log(`${COLORS.yellow}${t.regenerating}${COLORS.reset}`);
          {
            if (config.strictBranchCheck) {
              const syncBeforeRegenerate = await getBranchPointerStatus(gitRoot, {
                fetchBeforeSyncCheck: config.fetchBeforeSyncCheck,
              });
              if (isSyncBlocked(syncBeforeRegenerate.status)) {
                console.log(`${COLORS.red}${t.syncBlockedAtRegenerate}${COLORS.reset}`);
                printSyncBlockReason(syncBeforeRegenerate, t);
                break;
              }
            }

            const refreshedState = await collectAnalysisState();
            if (refreshedState.summary.total === 0) {
              console.log(`${COLORS.yellow}${t.noChanges}${COLORS.reset}`);
              break;
            }

            printSummary(refreshedState.summary, t);
            generated = await generateCandidate(buildPromptFromState(refreshedState));
          }
          if (!generated) {
            return;
          }
          break;

        case '3': {
          const editedMessage = await editInEditor(generated.message, promptControl);
          if (!editedMessage) {
            console.log(`${COLORS.yellow}${t.editAborted}${COLORS.reset}`);
            break;
          }

          const editedValidation = validateCommitMessage(editedMessage);
          if (!editedValidation.valid) {
            console.log(`${COLORS.yellow}${t.validationFailed}${COLORS.reset}`);
            printValidationIssues(editedValidation.blockingIssues, t);
            console.log(`${COLORS.yellow}${t.validationNeedsAction}${COLORS.reset}`);
            break;
          }

          if (editedValidation.warnings.length > 0) {
            console.log(`${COLORS.yellow}${t.validationWarnings}${COLORS.reset}`);
            printValidationWarnings(editedValidation.warnings, t);
          }

          if (config.strictBranchCheck) {
            const syncBeforeCommit = await getBranchPointerStatus(gitRoot, {
              fetchBeforeSyncCheck: config.fetchBeforeSyncCheck,
            });
            if (isSyncBlocked(syncBeforeCommit.status)) {
              console.log(`${COLORS.red}${t.syncBlockedAtCommit}${COLORS.reset}`);
              printSyncBlockReason(syncBeforeCommit, t);
              break;
            }
          }

          await commitWithMessage(gitRoot, editedValidation.message);
          console.log(`${COLORS.green}${t.successEdited}${COLORS.reset}`);
          return;
        }

        case '4':
          console.log(`${COLORS.red}${t.cancelled}${COLORS.reset}`);
          return;

        default:
          console.log(`${COLORS.red}${t.invalid}${COLORS.reset}`);
      }
    }
  } catch (error) {
    console.error(`${COLORS.red}${t.error}${COLORS.reset} ${error.message}`);
    process.exitCode = 1;
  } finally {
    promptControl.close();
  }
}

run();
