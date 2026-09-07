; Script generated for DigiAds Merchant POS Installer
#define MyAppName "DigiAds Merchant POS"
#define MyAppVersion "1.0"
#define MyAppPublisher "Ajay Kumar"
#define MyAppExeName "merchant_desktop.exe"

[Setup]
; Unique App ID
AppId={{D161AD50-B075-43B0-8CA7-D161AD509876}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\DigiAds
DefaultGroupName=DigiAds
DisableProgramGroupPage=yes

; --- Branding & Icons ---
SetupIconFile=windows\runner\resources\app_icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
OutputDir=build\installer
OutputBaseFilename=DigiAds_Merchant_POS_Setup_v{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern

; Privileges (lowest installs cleanly without requiring full admin prompt)
PrivilegesRequired=lowest

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Copy all release files, DLLs, and data from your Flutter build
Source: "build\windows\x64\runner\Release\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Start Menu shortcuts with DigiAds Brand Icon
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\data\flutter_assets\assets\icons\app_icon.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

; Desktop shortcut
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; IconFilename: "{app}\data\flutter_assets\assets\icons\app_icon.ico"

[Run]
; Auto launch option when installation finishes
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
