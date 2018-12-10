// @flow

import {AppState, Alert, Keyboard} from 'react-native'
import uuid from 'uuid'

import {Logger} from './utils/logging'
import walletManager from './crypto/wallet'
import {mirrorTxHistory, setBackgroundSyncError} from './actions/history'
import {changeLanguage} from './actions/language'
import {
  canFingerprintEncryptionBeEnabled,
  recreateAppSignInKeys,
  removeAppSignInKeys,
} from './helpers/deviceSettings'
import l10n from './l10n'
import {backgroundLockListener} from './helpers/backgroundLockHelper'
import {encryptCustomPin} from './crypto/customPin'
import {
  readAppSettings,
  writeAppSettings,
  removeAppSettings,
  AppSettingsError,
  APP_SETTINGS_KEYS,
  type AppSettingsKey,
} from './helpers/appSettings'
import networkInfo from './utils/networkInfo'
import {
  installationIdSelector,
  systemAuthSupportSelector,
  customPinHashSelector,
  languageSelector,
  tosSelector,
} from './selectors'
import assert from './utils/assert'

import NavigationService from './NavigationService'
import {ROOT_ROUTES} from './RoutesList'

import {type Dispatch} from 'redux'
import {type State} from './state'
import KeyStore from './crypto/KeyStore'

export const setAppSettingField = (fieldName: AppSettingsKey, value: any) => (
  dispatch: Dispatch<any>,
) => {
  writeAppSettings(fieldName, value)
  dispatch({
    path: ['appSettings', fieldName],
    payload: value,
    type: 'SET_APP_SETTING_FIELD',
    reducer: (state, payload) => payload,
  })
}

export const clearAppSettingField = (fieldName: AppSettingsKey) => async (
  dispatch: Dispatch<any>,
) => {
  await removeAppSettings(fieldName)

  dispatch({
    path: ['appSettings', fieldName],
    payload: null,
    type: 'REMOVE_APP_SETTING_FIELD',
    reducer: (state, payload) => payload,
  })
}

export const setEasyConfirmation = (enable: boolean) => ({
  path: ['wallet', 'isEasyConfirmationEnabled'],
  payload: enable,
  reducer: (state: State, value: boolean) => value,
  type: 'SET_EASY_CONFIRMATION',
})

const _updateWallets = (wallets) => ({
  path: ['wallets'],
  payload: wallets,
  reducer: (state, value) => value,
  type: 'UPDATE_WALLETS',
})

const updateWallets = () => (dispatch: Dispatch<any>) => {
  const wallets = walletManager.getWallets()
  dispatch(_updateWallets(wallets))
}

const _setAppSettings = (appSettings) => ({
  path: ['appSettings'],
  payload: appSettings,
  type: 'SET_APP_SETTINGS',
  reducer: (state, payload) => payload,
})

const reloadAppSettings = () => async (dispatch: Dispatch<any>) => {
  const appSettings = await readAppSettings()
  dispatch(_setAppSettings(appSettings))
  if (appSettings.languageCode) {
    dispatch(changeLanguage(appSettings.languageCode))
  }
}

export const encryptAndStoreCustomPin = (pin: string) => async (
  dispatch: Dispatch<any>,
  getState: () => State,
) => {
  const state = getState()
  const installationId = state.appSettings.installationId
  if (!installationId) {
    throw new AppSettingsError(APP_SETTINGS_KEYS.INSTALLATION_ID)
  }
  const customPinHash = await encryptCustomPin(installationId, pin)
  dispatch(setAppSettingField(APP_SETTINGS_KEYS.CUSTOM_PIN_HASH, customPinHash))
}

export const removeCustomPin = () => async (
  dispatch: Dispatch<any>,
  getState: () => State,
) => {
  await dispatch(clearAppSettingField(APP_SETTINGS_KEYS.CUSTOM_PIN_HASH))
}

export const navigateFromSplash = () => (
  dispatch: Dispatch<any>,
  getState: any,
) => {
  // TODO(ppershing): here we should switch between
  // onboarding and normal wallet flow
  const state = getState()

  let route

  if (
    !languageSelector(state) ||
    !tosSelector(state) ||
    (!systemAuthSupportSelector(state) && !customPinHashSelector(state))
  ) {
    route = ROOT_ROUTES.FIRST_RUN
  } else {
    // TODO: change to login in prod
    route = ROOT_ROUTES.INIT
  }

  // cool-user: Fixes app crashing, as Android back
  // button remounts the App component other solution is:
  // eslint-disable-next-line
  // https://github.com/facebook/react-native/issues/13775#issuecomment-319673305
  try {
    NavigationService.navigate(route)
  } catch (e) {
    Logger.warn('Could not navigate from splash screen')
  }
}

export const acceptAndSaveTos = () => (dispatch: Dispatch<any>) => {
  dispatch(setAppSettingField(APP_SETTINGS_KEYS.ACCEPTED_TOS, true))
}

const firstRunSetup = () => (dispatch: Dispatch<any>, getState: any) => {
  const installationId = uuid.v4()
  dispatch(
    setAppSettingField(APP_SETTINGS_KEYS.INSTALLATION_ID, installationId),
  )
}

export const closeWallet = () => async (dispatch: Dispatch<any>) => {
  await walletManager.closeWallet()
}

export const logout = () => async (dispatch: Dispatch<any>) => {
  await closeWallet()

  await dispatch(navigateFromSplash())
}

export const initApp = () => async (dispatch: Dispatch<any>, getState: any) => {
  await dispatch(reloadAppSettings())

  const state = getState()
  const installationId = installationIdSelector(state)
  if (!installationId) {
    dispatch(firstRunSetup())
  }

  // prettier-ignore
  const hasEnrolledFingerprints =
    await canFingerprintEncryptionBeEnabled()

  dispatch(
    setAppSettingField(
      APP_SETTINGS_KEYS.HAS_FINGERPRINTS_ENROLLED,
      hasEnrolledFingerprints,
    ),
  )

  await walletManager.initialize()
  await dispatch(updateWallets())

  if (hasEnrolledFingerprints && systemAuthSupportSelector(state)) {
    // On android 6 signin keys can get invalidated,
    // if that happen we want to regenerate them
    if (installationId) {
      const isKeyValid = await KeyStore.isKeyValid(installationId, 'BIOMETRICS')
      if (!isKeyValid) {
        await recreateAppSignInKeys(installationId)
      }
    }
  }

  dispatch({
    path: ['isAppInitialized'],
    payload: true,
    reducer: (state, value) => value,
    type: 'INITIALIZE_APP',
  })
  dispatch(navigateFromSplash())
}

const _setOnline = (isOnline: boolean) => (dispatch, getState) => {
  const state = getState()
  if (state.isOnline === isOnline) return // avoid useless state updates
  dispatch({
    type: 'Set isOnline',
    path: ['isOnline'],
    payload: isOnline,
    reducer: (state, payload) => payload,
  })
}

const setIsKeyboardOpen = (isOpen) => ({
  type: 'Set isKeyboardOpen',
  path: ['isKeyboardOpen'],
  payload: isOpen,
  reducer: (state, payload) => payload,
})

export const setupHooks = () => (dispatch: Dispatch<any>) => {
  Logger.debug('setting up isOnline callback')
  networkInfo.subscribe(({isOnline}) => dispatch(_setOnline(isOnline)))
  dispatch(_setOnline(networkInfo.getConnectionInfo().isOnline))

  Logger.debug('setting wallet manager hook')
  walletManager.subscribe(() => dispatch(mirrorTxHistory()))
  walletManager.subscribeBackgroundSyncError((err) =>
    dispatch(setBackgroundSyncError(err)),
  )

  Logger.debug('setting up app lock')
  const onTimeoutAction = () => {
    dispatch(logout())
  }

  AppState.addEventListener('change', () => {
    backgroundLockListener(onTimeoutAction)
  })

  Logger.debug('setting up keyboard manager')
  Keyboard.addListener('keyboardDidShow', () =>
    dispatch(setIsKeyboardOpen(true)),
  )
  Keyboard.addListener('keyboardDidHide', () =>
    dispatch(setIsKeyboardOpen(false)),
  )
}

export const generateNewReceiveAddress = () => async (
  dispatch: Dispatch<any>,
) => {
  return await walletManager.generateNewUiReceiveAddress()
}

export const generateNewReceiveAddressIfNeeded = () => async (
  dispatch: Dispatch<any>,
) => {
  return await walletManager.generateNewUiReceiveAddressIfNeeded()
}

export const changeWalletName = (newName: string) => async (
  dispatch: Dispatch<any>,
) => {
  await walletManager.rename(newName)
  dispatch(updateWallets())
}

export const createWallet = (
  name: string,
  mnemonic: string,
  password: string,
) => async (dispatch: Dispatch<any>) => {
  await walletManager.createWallet(name, mnemonic, password)
  dispatch(updateWallets())
}

export const removeCurrentWallet = () => async (dispatch: Dispatch<any>) => {
  await walletManager.removeCurrentWallet()
  dispatch(updateWallets())
}

type DialogOptions = {|
  title: string,
  message: string,
  yesButton: string,
  noButton?: string,
|}

export const DIALOG_BUTTONS = Object.freeze({
  YES: 'Yes',
  NO: 'No',
})

type DialogButton = $Values<typeof DIALOG_BUTTONS>

const showDialog = (translations: DialogOptions): Promise<DialogButton> =>
  new Promise((resolve, reject) => {
    const {title, message, yesButton, noButton} = translations
    const buttons = []

    assert.assert(yesButton, 'Yes button should be provided')

    if (noButton) {
      buttons.push({
        text: noButton,
        onPress: () => resolve(DIALOG_BUTTONS.NO),
      })
    }

    buttons.push({text: yesButton, onPress: () => resolve(DIALOG_BUTTONS.YES)})

    Alert.alert(title, message, buttons, {cancelable: false})
  })

export const showErrorDialog = (
  getDialog: (
    translations: typeof l10n.translations.errorDialogs,
  ) => DialogOptions,
): Promise<DialogButton> =>
  showDialog(getDialog(l10n.translations.errorDialogs))

export const showConfirmationDialog = (
  getDialog: (
    translations: typeof l10n.translations.confirmationDialogs,
  ) => DialogOptions,
): Promise<DialogButton> =>
  showDialog(getDialog(l10n.translations.confirmationDialogs))

export const setSystemAuth = (enable: boolean) => async (
  dispatch: Dispatch<any>,
  getState: any,
) => {
  const canBeDisabled = walletManager.canBiometricsSignInBeDisabled()

  if (!enable && !canBeDisabled) {
    throw new Error(
      'Can not disable system auth without disabling easy confirmation.',
    )
  }

  dispatch(setAppSettingField(APP_SETTINGS_KEYS.SYSTEM_AUTH_ENABLED, enable))

  const installationId = installationIdSelector(getState())
  if (!installationId) {
    throw new Error('Installation id is not defined')
  }

  if (enable) {
    await recreateAppSignInKeys(installationId)

    await dispatch(removeCustomPin())
  } else {
    await removeAppSignInKeys(installationId)
  }
}

export const handleGeneralError = async (message: string, e: Error) => {
  Logger.error(message, e)

  await showErrorDialog((dialogs) => dialogs.general)
}
