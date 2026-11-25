/* Password visibility: delegated so it also works inside Supabase recovery dialogs. */
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-password-toggle]');
  if(!button)return;
  const input=document.getElementById(button.dataset.passwordToggle);
  if(!input)return;
  const reveal=input.type==='password';
  input.type=reveal?'text':'password';
  button.setAttribute('aria-pressed',String(reveal));
  const label=reveal?button.dataset.labelHide:button.dataset.labelShow;
  button.setAttribute('aria-label',label);
  button.title=label;
  const eye=button.querySelector('[data-eye-show]'),eyeOff=button.querySelector('[data-eye-hide]');
  if(eye)eye.hidden=reveal;
  if(eyeOff)eyeOff.hidden=!reveal;
  button.classList.toggle('is-visible',reveal);
});
