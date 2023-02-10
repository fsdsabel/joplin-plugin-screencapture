# Joplin Plugin for Screen Capture

This plugin adds two buttons to the note editor that allows you to capture the screen using ffmpeg. You need to have ffmpeg somewhere and give it some meaningful options. Look at the FFMPEG options in the Joplin settings.

The default settings are for Windows and my microphone. An error handling is not really implemented so make sure to look at the task manager for an ffmpeg process running.

There is no real indication that a screen capture is running. If there is some API to do this, I'd be glad about a note.

## Building the plugin

The plugin is built using Webpack, which creates the compiled code in `/dist`. A JPL archive will also be created at the root, which can use to distribute the plugin.

To build the plugin, simply run `npm run dist`.

The project is setup to use TypeScript, although you can change the configuration to use plain JavaScript.

## Updating the plugin framework

To update the plugin framework, run `npm run update`.

In general this command tries to do the right thing - in particular it's going to merge the changes in package.json and .gitignore instead of overwriting. It will also leave "/src" as well as README.md untouched.

The file that may cause problem is "webpack.config.js" because it's going to be overwritten. For that reason, if you want to change it, consider creating a separate JavaScript file and include it in webpack.config.js. That way, when you update, you only have to restore the line that include your file.
