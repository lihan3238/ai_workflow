import {
  buildRuntimeDevicePayload,
  defaultRemoteRootForTargetValue,
  fallbackDeviceAddCommand
} from "./browser";

interface ConfirmationSelectors {
  dialog?: string;
  title?: string;
  message?: string;
}

interface DeleteButtonOptions {
  buttonSelector?: string;
  redirectTo?: string;
  statusElement?: HTMLElement | null;
}

function confirmationElements(selectors: ConfirmationSelectors = {}): {
  dialog: HTMLDialogElement | null;
  title: HTMLElement | null;
  message: HTMLElement | null;
} {
  const dialog = document.querySelector(selectors.dialog ?? "#runtime-confirm-dialog");
  return {
    dialog: dialog instanceof HTMLDialogElement ? dialog : null,
    title: document.querySelector(selectors.title ?? "#runtime-confirm-title"),
    message: document.querySelector(selectors.message ?? "#runtime-confirm-message")
  };
}

export function askRuntimeConfirmation(
  titleText: string,
  messageText: string,
  selectors?: ConfirmationSelectors
): Promise<boolean> {
  const { dialog, title, message } = confirmationElements(selectors);
  return new Promise((resolve) => {
    if (!dialog) {
      resolve(false);
      return;
    }
    if (title) title.textContent = titleText;
    if (message) message.textContent = messageText;
    const handleClose = () => {
      dialog.removeEventListener("close", handleClose);
      resolve(dialog.returnValue === "confirm");
    };
    dialog.addEventListener("close", handleClose);
    dialog.showModal();
  });
}

export async function deleteRuntimeDevice(
  id: string,
  options: { redirectTo?: string; statusElement?: HTMLElement | null } = {}
): Promise<void> {
  const confirmed = await askRuntimeConfirmation(
    "删除主机",
    `${id} 的扫描配置和对应快照会被移除。`
  );
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/runtime/devices/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    if (!response.ok) throw new Error(await response.text());
    if (options.redirectTo) {
      window.location.href = options.redirectTo;
    } else {
      window.location.reload();
    }
  } catch (error) {
    const message = `当前部署是只读静态站或 API 不可用，请手动编辑 runtime/devices/config.json。${error instanceof Error ? ` ${error.message}` : ""}`;
    if (options.statusElement) {
      options.statusElement.textContent = message;
      return;
    }
    await askRuntimeConfirmation("删除失败", message);
  }
}

export function wireRuntimeDeviceDeleteButtons(options: DeleteButtonOptions = {}): void {
  const selector = options.buttonSelector ?? ".device-delete-button";
  for (const button of document.querySelectorAll(selector)) {
    button.addEventListener("click", async () => {
      const id = button.getAttribute("data-device-id");
      if (!id) return;
      await deleteRuntimeDevice(id, {
        redirectTo: options.redirectTo,
        statusElement: options.statusElement
      });
    });
  }
}

export function wireRuntimeDeviceOnboarding(): void {
  const form = document.getElementById("device-onboard-form");
  const targetInput = document.getElementById("ssh-target");
  const labelInput = document.getElementById("device-label");
  const remoteRootInput = document.getElementById("remote-root");
  const onboardStatus = document.getElementById("device-onboard-status");
  let remoteRootEdited = false;

  function syncRemoteRootDefault() {
    if (!(targetInput instanceof HTMLInputElement) || !(remoteRootInput instanceof HTMLInputElement)) {
      return;
    }
    if (remoteRootEdited) return;
    const remoteRoot = defaultRemoteRootForTargetValue(targetInput.value);
    if (remoteRoot) remoteRootInput.value = remoteRoot;
  }

  remoteRootInput?.addEventListener("input", () => {
    remoteRootEdited = true;
  });
  targetInput?.addEventListener("input", syncRemoteRootDefault);
  syncRemoteRootDefault();

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (
      !(targetInput instanceof HTMLInputElement) ||
      !(labelInput instanceof HTMLInputElement) ||
      !(remoteRootInput instanceof HTMLInputElement) ||
      !(onboardStatus instanceof HTMLElement)
    ) {
      return;
    }

    const result = buildRuntimeDevicePayload({
      sshTarget: targetInput.value,
      label: labelInput.value,
      remoteRoot: remoteRootInput.value
    });
    if (!result.ok) {
      onboardStatus.textContent = result.message;
      return;
    }

    const { payload } = result;
    const confirmed = await askRuntimeConfirmation("添加主机", `${payload.label} (${payload.ssh})`);
    if (!confirmed) return;

    onboardStatus.textContent = "正在写入 runtime/devices/config.json...";
    try {
      const response = await fetch("/api/runtime/devices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await response.text());
      onboardStatus.textContent = "已添加主机并重建 operator 页面，正在刷新。";
      window.location.reload();
    } catch {
      onboardStatus.textContent = `当前部署是只读静态站或 API 不可用，请执行: ${fallbackDeviceAddCommand(payload)}`;
    }
  });
}
