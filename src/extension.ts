// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import { readFileSync } from "fs";
import axios from "axios";
import moment = require("moment");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log("Will You Snail development tools active");

    let docsPanel: vscode.WebviewPanel | undefined = undefined;

    let docs: string[] = [];

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let viewDocsCommand = vscode.commands.registerCommand(
        "wys-development-tools.viewDocumentation",
        async () => {
            if (docs.length === 0) {
                const barMsg = vscode.window.setStatusBarMessage(
                    "Refreshing WYS Documentation..."
                );

                const rateLimit = await axios
                    .get("https://api.github.com/rate_limit")
                    .then((res) => res.data.resources.core);

                if (rateLimit.remaining < 5) {
                    vscode.window.showWarningMessage(
                        `Your GitHub API rate limit is below 5. The documentation cannot be refreshed. Try again ${moment(
                            moment.unix(rateLimit.reset)
                        ).fromNow()}.`
                    );
                    barMsg.dispose();
                    return;
                }

                const treeSha = await axios
                    .get(
                        "https://api.github.com/repos/thennothinghappened/WYS-Documentation/commits"
                    )
                    .then((res) => res.data[0].sha);

                const rootTree = await axios
                    .get(
                        `https://api.github.com/repos/thennothinghappened/WYS-Documentation/git/trees/${treeSha}`
                    )
                    .then((res) => res.data.tree);

                let globalFunctionsSha: string = "";

                for (let index = 0; index < rootTree.length; index++) {
                    const { path, sha } = rootTree[index];

                    if (path === "Global Scripts") {
                        globalFunctionsSha = sha;
                    }
                }

                const globalFunctions = await axios
                    .get(
                        `https://api.github.com/repos/thennothinghappened/WYS-Documentation/git/trees/${globalFunctionsSha}`
                    )
                    .then((res) => res.data.tree);

                for (let index = 0; index < globalFunctions.length; index++) {
                    const { path } = globalFunctions[index];

                    if (path.startsWith("!")) {
                        continue;
                    }

                    docs.push(`Global Scripts/${path.replace(".md", "")}`);
                }

                barMsg.dispose();
            }

            const columnToShowIn = vscode.ViewColumn.One;

            const docToShow = await vscode.window.showQuickPick(docs, {
                canPickMany: false,
                title: "Select function to view",
                ignoreFocusOut: true,
            });

            if (!docToShow) {
                return;
            }

            if (docsPanel) {
                docsPanel.reveal(columnToShowIn);
            } else {
                docsPanel = vscode.window.createWebviewPanel(
                    "wysDocs",
                    "Will You Snail Documentation",
                    columnToShowIn,
                    { enableScripts: true }
                );

                // Reset when the current panel is closed
                docsPanel.onDidDispose(
                    () => {
                        docsPanel = undefined;
                    },
                    null,
                    context.subscriptions
                );
            }

            docsPanel.title = `${docToShow}`;

            const documentationMarkdown: string = await axios
                .get(
                    `https://raw.githubusercontent.com/thennothinghappened/WYS-Documentation/main/${encodeURI(
                        `${docToShow}`
                    )}.md`
                )
                .then((res) =>
                    res.data.replaceAll("\n", "\\n").replaceAll('"', '\\"')
                );

            // Get path to resource on disk
            const onDiskPath = readFileSync(
                path.join(context.extensionPath, "wys-docs", "index.html")
            )
                .toString()
                .replace("MARKDOWN GOES HERE", documentationMarkdown);

            docsPanel.webview.html = onDiskPath;
        }
    );

    let refreshDocsCommand = vscode.commands.registerCommand(
        "wys-development-tools.refreshDocumentation",
        async () => {
            const barMsg = vscode.window.setStatusBarMessage(
                "Refreshing WYS Documentation..."
            );

            const rateLimit = await axios
                .get("https://api.github.com/rate_limit")
                .then((res) => res.data.resources.core);

            if (rateLimit.remaining < 5) {
                vscode.window.showWarningMessage(
                    `Your GitHub API rate limit is below 5. The documentation cannot be refreshed. Try again ${moment(
                        moment.unix(rateLimit.reset)
                    ).fromNow()}.`
                );
                barMsg.dispose();
                return;
            }

            docs = [];

            const treeSha = await axios
                .get(
                    "https://api.github.com/repos/thennothinghappened/WYS-Documentation/commits"
                )
                .then((res) => res.data[0].sha);

            const rootTree = await axios
                .get(
                    `https://api.github.com/repos/thennothinghappened/WYS-Documentation/git/trees/${treeSha}`
                )
                .then((res) => res.data.tree);

            let globalFunctionsSha: string = "";

            for (let index = 0; index < rootTree.length; index++) {
                const { path, sha } = rootTree[index];

                if (path === "Global Scripts") {
                    globalFunctionsSha = sha;
                }
            }

            const globalFunctions = await axios
                .get(
                    `https://api.github.com/repos/thennothinghappened/WYS-Documentation/git/trees/${globalFunctionsSha}`
                )
                .then((res) => res.data.tree);

            for (let index = 0; index < globalFunctions.length; index++) {
                const { path } = globalFunctions[index];

                if (path.startsWith("!")) {
                    continue;
                }

                docs.push(`Global Scripts/${path.replace(".md", "")}`);
            }

            barMsg.dispose();

            vscode.window.showInformationMessage("Documentation refreshed!");
        }
    );

    context.subscriptions.push(viewDocsCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}
