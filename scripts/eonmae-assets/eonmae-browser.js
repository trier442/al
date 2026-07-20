document.addEventListener('click',function(e){
  const blank=e.target.closest('.blank,.flowblank');
  if(blank){
    const mask=blank.querySelector('.blank-mask'),answer=blank.querySelector('.blank-answer');
    const open=blank.classList.toggle('open');
    blank.setAttribute('aria-pressed',String(open));mask.hidden=open;answer.hidden=!open;return;
  }
  const choice=e.target.closest('.choice');if(!choice)return;
  const q=choice.closest('.q'),answer=Number(q.dataset.answer),picked=Number(choice.dataset.choice);
  q.querySelectorAll('.choice').forEach((button)=>{button.classList.remove('correct','wrong');if(Number(button.dataset.choice)===answer)button.classList.add('correct');});
  if(picked!==answer)choice.classList.add('wrong');
  const result=q.querySelector('.result');result.hidden=false;
  result.textContent=picked===answer?'정답입니다. 다섯 선택지의 해설을 확인하세요.':'오답입니다. 정답과 다섯 선택지의 해설을 확인하세요.';
  const explanations=q.querySelector('.choice-explanations');explanations.hidden=false;
  explanations.querySelectorAll('.choice-exp').forEach((item)=>item.hidden=false);
});
