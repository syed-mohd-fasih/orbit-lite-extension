@echo off
:: Launches the native messaging host with Node. Chrome invokes this .bat and
:: pipes the native-messaging stdio through to node host.js.
:: %~dp0 = the folder this .bat lives in.
node "%~dp0host.js"
