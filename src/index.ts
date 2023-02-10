import joplin from "api";
import { SettingItemType, ToolbarButtonLocation } from "api/types";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import path = require("path");

joplin.plugins.register({
  onStart: async function () {
    console.info("Screen Capture plugin loaded");

    await joplin.settings.registerSettings({
      "screencapture.ffmpeg.path": {
        value: "c:\\Program Files\\ffmpeg\\ffmpeg.exe",
        label: "FFMPEG executable",
        type: SettingItemType.String,
        public: true,
      },
    });
    await joplin.settings.registerSettings({
      "screencapture.ffmpeg.options": {
        value:
          "-y -init_hw_device d3d11va -filter_complex ddagrab=0:framerate=10,hwdownload,format=bgra -f dshow -i \"audio='Mikrofon (RODE NT-USB)'\" -af:a volume=0.8,highpass=200 -ac 1 -c:v h264_qsv -preset fast -scenario 1 -b:a 64k",
        label: "FFMPEG options",
        type: SettingItemType.String,
        public: true,
      },
    });
    await joplin.settings.registerSettings({
      "screencapture.ffmpeg.tempfolder": {
        value: "c:\\temp",
        label: "FFMPEG temporary folder",
        type: SettingItemType.String,
        public: true,
      },
    });

    var process: ChildProcessWithoutNullStreams;
    var captureStartTime: Date;
    var captureStopTime: Date;

    await joplin.commands.register({
      name: "screencapture.startcapture.command",
      label: "Start screen capture",
      iconName: "fas fa-desktop",
      execute: async () => {
        if (!process) {
          console.info("Starting screen capture");
          captureStartTime = new Date();
          var tempFolder = await joplin.settings.value(
            "screencapture.ffmpeg.tempfolder"
          );
          var tempFile = path.join(tempFolder, "joplin_screen_recording.mp4");
          var optStr: string = await joplin.settings.value(
            "screencapture.ffmpeg.options"
          );
          var opts = parseCommandLineArguments(optStr);
          opts.push(tempFile);
          process = spawn(
            await joplin.settings.value("screencapture.ffmpeg.path"),
            opts
          );
          process.on("close", async (code, signal) => {
            console.info(
              `FFMPEG exited with code ${code} and signal ${signal}.`
            );

            const currentNote = await joplin.workspace.selectedNote();
            if (currentNote) {
              console.info(`Adding video file ${tempFile} to resources.`);
              const attachment = await joplin.data.post(
                ["resources"],
                null,
                {
                  mime: "video/mp4",
                },
                [{ path: tempFile }]
              );

              const modifiedBody =
                currentNote.body + "\n\n" +
                createVideoAttachmentBody(
                  attachment,
                  captureStartTime,
                  captureStopTime
                );

			  await updateNoteBody(modifiedBody, currentNote.id, true);
            }

			const fs = joplin.require('fs-extra');
			await fs.unlinkSync(tempFile);
          });
          /*process.stdout.on('data', (data)=> {
						console.debug(data.toString());
					});
					process.stderr.on('data', (data)=> {
						console.debug(data.toString());
					});*/
        } else {
          console.error("Screen capture already running");
        }
      },
    });
    await joplin.commands.register({
      name: "screencapture.stopcapture.command",
      label: "Stop screen capture",
      iconName: "fas fa-stop",
      execute: async () => {
        if (process) {
          console.info("Stopping screen capture.");
          captureStopTime = new Date();
          process.stdin.write("q");
          process = undefined;
        }
      },
    });

    joplin.views.toolbarButtons.create(
      "startCaptureBtn",
      "screencapture.startcapture.command",
      ToolbarButtonLocation.EditorToolbar
    );
    joplin.views.toolbarButtons.create(
      "stopCaptureBtn",
      "screencapture.stopcapture.command",
      ToolbarButtonLocation.EditorToolbar
    );
  },
});
function createVideoAttachmentBody(
  attachment: any,
  captureStartTime: Date,
  captureStopTime: Date
): String {
  return `[Screen Recording (${captureStartTime.toLocaleString()} - ${captureStopTime.toLocaleString()})](:/${
    attachment.id
  })`;
}

async function updateNoteBody(
  newBodyStr: string,
  noteId: string,
  userTriggered: boolean
) {
  console.info("Update note: " + noteId);
  const selectedNote = await joplin.workspace.selectedNote();
  const codeView = await joplin.settings.globalValue("editor.codeView");
  const noteVisiblePanes = await joplin.settings.globalValue(
    "noteVisiblePanes"
  );

  // Update actual note only when in viewer mode (rich text editor delete HTML comments) or user triggerd
  // Issue #13
  if (
    selectedNote.id === noteId &&
    codeView === true &&
    (noteVisiblePanes === "viewer" || userTriggered === true)
  ) {
    console.log("   Use replaceSelection");
    await joplin.commands.execute("textSelectAll");
    await joplin.commands.execute("replaceSelection", newBodyStr);
  } else if (selectedNote.id !== noteId) {
    console.log("   Use API");
    await joplin.data.put(["notes", noteId], null, {
      body: newBodyStr,
    });
  } else {
    console.log("   skipping");
  }
}
function parseCommandLineArguments(args: string): string[] {
	const result: string[] = [];
	let currentArg = '';
	let insideQuotedArg = false;
  
	for (const char of args) {
	  if (char === ' ' && !insideQuotedArg) {
		result.push(currentArg);
		currentArg = '';
	  } else if (char === '"') {
		insideQuotedArg = !insideQuotedArg;
	  } else {
		currentArg += char;
	  }
	}
  
	if (currentArg) {
	  result.push(currentArg);
	}
  
	return result;
  }