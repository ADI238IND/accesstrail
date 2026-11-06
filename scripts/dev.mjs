import http from 'node:http';
import worker from '../worker/index.js';
const portArg=process.argv.indexOf('--port');
const port=Number(process.env.PORT||(portArg>=0?process.argv[portArg+1]:3000));
http.createServer(async(req,res)=>{try{
const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:req,duplex:'half'}:{})});
const response=await worker.fetch(request,process.env,{});res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body){for await(const chunk of response.body)res.write(chunk);}res.end();
}catch{res.writeHead(500);res.end('Request failed');}}).listen(port,'0.0.0.0',()=>console.log('AccessTrail on port '+port));
