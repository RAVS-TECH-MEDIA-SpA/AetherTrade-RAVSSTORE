import crypto from 'crypto';
import phpSerialize from 'php-serialize'; // Paddle usa firmas estilo PHP

export const verifyPaddleSignature = (postData: any) => {
  const signature = postData.p_signature;
  const keys = Object.keys(postData).sort();
  const data: any = {};
  
  keys.forEach(key => {
    if (key !== 'p_signature') data[key] = postData[key];
  });

  const serialized = phpSerialize.serialize(data);
  const verifier = crypto.createVerify('sha1');
  verifier.update(serialized);
  verifier.end();

  return verifier.verify(process.env.PADDLE_PUBLIC_KEY!, signature, 'base64');
};

// En tu Express app
app.post('/webhook/paddle', async (req, res) => {
  if (!verifyPaddleSignature(req.body)) {
    return res.status(401).send('Invalid Signature');
  }

  const { alert_name, passthrough, email } = req.body;

  if (alert_name === 'payment_succeeded') {
    const { sku } = JSON.parse(passthrough);
    
    // Disparamos el evento de Pub/Sub para el fulfillment automático
    await pubsub.topic('order-finalized').publish(Buffer.from(JSON.stringify({
      sku,
      email,
      market: req.body.country // Paddle nos da el país automáticamente
    })));
  }

  res.status(200).send('OK');
});