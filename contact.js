(() => {
  const form=document.getElementById('contactForm'); if(!form) return;
  const status=document.getElementById('contactStatus'); const config=window.PIXELSWITCH_CONFIG||{};
  form.addEventListener('submit',async(event)=>{
    event.preventDefault(); const values=Object.fromEntries(new FormData(form));
    status.textContent='Preparing your message…';
    if(config.contactApiUrl){
      try{const response=await fetch(config.contactApiUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)});if(!response.ok)throw new Error();status.textContent='Message sent. Thank you.';form.reset();return;}catch{status.textContent='The contact service could not be reached. A copy will be downloaded instead.';}
    }
    const text=`PixelSwitch contact message\n\nName: ${values.name}\nEmail: ${values.email}\nTopic: ${values.topic}\n\n${values.message}\n`;
    const blob=new Blob([text],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`pixelswitch-message-${Date.now()}.txt`;a.click();URL.revokeObjectURL(url);status.textContent='Message downloaded. Add a contact API URL in site-config.js to send forms directly.';
  });
})();
