import type { Socket } from 'socket.io-client';

export function showAuth(
  container: HTMLElement,
  socket: Socket,
  onSuccess: () => void,
): void {
  container.innerHTML = `
    <div class="auth-screen">
      <h1>StageVisualizer</h1>
      <form class="pin-form">
        <input class="pin-input" type="password" inputmode="numeric" pattern="[0-9]*"
               maxlength="8" placeholder="Enter PIN" autocomplete="off" />
        <button type="submit" class="pin-submit">Connect</button>
      </form>
      <div class="pin-error" style="display:none"></div>
    </div>
  `;

  const form = container.querySelector('.pin-form')!;
  const input = container.querySelector('.pin-input') as HTMLInputElement;
  const error = container.querySelector('.pin-error') as HTMLElement;

  input.focus();

  form.addEventListener('submit', (e: Event) => {
    e.preventDefault();
    error.style.display = 'none';
    socket.emit('auth', { pin: input.value });
  });

  socket.on('auth-result', (result: { success: boolean }) => {
    if (result.success) {
      onSuccess();
    } else {
      error.textContent = 'Wrong PIN. Try again.';
      error.style.display = 'block';
      input.value = '';
      input.focus();
    }
  });
}
