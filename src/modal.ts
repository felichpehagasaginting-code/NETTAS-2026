let activeConfirmResolve: ((val: boolean) => void) | null = null;
let activeAlertResolve: (() => void) | null = null;

export function customConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    let overlay = document.getElementById('custom-confirm-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'custom-confirm-overlay';
      overlay.className = 'custom-modal-overlay';
      overlay.innerHTML = `
        <div class="custom-modal-box">
          <div class="custom-modal-icon">⚠️</div>
          <div class="custom-modal-message" id="custom-confirm-message"></div>
          <div class="custom-modal-actions">
            <button class="custom-modal-btn btn-confirm" id="custom-confirm-ok">OK</button>
            <button class="custom-modal-btn btn-cancel" id="custom-confirm-cancel">BATAL</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      document.getElementById('custom-confirm-ok')!.addEventListener('click', () => {
        closeConfirm(true);
      });
      document.getElementById('custom-confirm-cancel')!.addEventListener('click', () => {
        closeConfirm(false);
      });
      
      // Close on background click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeConfirm(false);
        }
      });
    }

    document.getElementById('custom-confirm-message')!.innerHTML = message;
    overlay.classList.add('show');
    activeConfirmResolve = resolve;
  });
}

function closeConfirm(value: boolean): void {
  const overlay = document.getElementById('custom-confirm-overlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
  if (activeConfirmResolve) {
    activeConfirmResolve(value);
    activeConfirmResolve = null;
  }
}

export function customAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    let overlay = document.getElementById('custom-alert-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'custom-alert-overlay';
      overlay.className = 'custom-modal-overlay';
      overlay.innerHTML = `
        <div class="custom-modal-box">
          <div class="custom-modal-icon">ℹ️</div>
          <div class="custom-modal-message" id="custom-alert-message"></div>
          <div class="custom-modal-actions">
            <button class="custom-modal-btn btn-confirm" id="custom-alert-ok">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      document.getElementById('custom-alert-ok')!.addEventListener('click', () => {
        closeAlert();
      });
      
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeAlert();
        }
      });
    }

    document.getElementById('custom-alert-message')!.innerHTML = message;
    overlay.classList.add('show');
    activeAlertResolve = resolve;
  });
}

function closeAlert(): void {
  const overlay = document.getElementById('custom-alert-overlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
  if (activeAlertResolve) {
    activeAlertResolve();
    activeAlertResolve = null;
  }
}
