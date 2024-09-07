import type { ForgeConfig } from "@electron-forge/shared-types";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const config: ForgeConfig = {
  packagerConfig: {
    executableName: "printer-pal",
    name: 'Printer Pal',
    asar: true,
    icon: './src/app_images/appicon',
    appCategoryType: 'public.app-category.graphics-design',
    osxSign: {
      identity: `Developer ID Application: ${process.env.APPLE_SIGN_ID_NAME} (${process.env.APPLE_SIGN_ID})`,
    },
    osxNotarize: {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.TEAM_ID,
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        noMsi: false,
        iconUrl: "https://raw.githubusercontent.com/vrk/pouch.studio/main/images/appicon.ico",
        setupIcon: './src/app_images/appicon.ico',
        loadingGif: './src/app_images/installing.gif'
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      config: (arch: any) => {
        console.log("returning config for", arch)
        const dmgConfig = {
          name: "Printer Pal",
          background: './src/app_images/installer-bg.png',
          format: 'ULFO',
          icon: './src/app_images/appicon.icns',
          overwrite: true,
          additionalDMGOptions: {
            window: {
              size: {
                width: 658,
                height: 498
              }
            }
          }
        }
        if (arch === 'x64') {
          dmgConfig.name = "Printer Pal (intel)"
        }
        return dmgConfig;
      }
    },
    {
      name: '@electron-forge/maker-zip',
      config: { }
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        options: {
          icon: './src/app_images/appicon.png',
          name: 'printer-pal',
          productName: 'printer-pal'
        }
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
  ],

  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/main.ts",
          config: "vite.main.config.ts",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: true,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "vrk",
          name: "big-printer-pal",
        },
        prerelease: true,
      },
    },
  ],
};

export default config;
