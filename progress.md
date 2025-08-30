# YANK

Browser extension that bridges the gap between vague user queries and search engine results.

### Version 1: Packet Sniffer Approach
___
This approach parses through packets sent over a network to obtain the search query request. 
Wireshark was useful to see the flux of packets when a search query is launched.
Most browsers launch their searhc queries via `https` so it's hard to decrypt making this approach inconvenient.
<br>

### Version 2: Browser Extension Approach
___
Building off the `RedGiraffe`, this approach obtains session info via a browser extension. The extension then communicates with a server that does all the evaluation and transforming.

#### Checkpoints reached as of 7/27 :
1) Extension can detect a search session
2) Search query extracted from session local storage
3) Query text sent to a background script

#### Up next:
- Explore `background.js` capabilities and attempt to send text without encountering a `CORS` fault.
- Setup a simple server that can accept the text and do some simple transformation.

#### Checkpoints reached as of 7/28 :
1) Background.js sends the text to a (and the URL) to a server running on node.js

#### Up next:
- Explore ideal language models for the application
- Look into a tool that categories fallacies in statements
  - Would prove useful to develop a tool that creates a score for vagueness
  - Paper on logical fallacy detection with LMs: [Paper](https://arxiv.org/html/2503.23363v1#S4)
  - Create the ideal prompt to fine tune the LM for the task

#### Checkpoints reached as of 7/29 :
1) Ollama hosted on AWS with a secure connection over SSM.
2) Docker installed and fucntional on hosted instance
3) Open WebUI is funtional although it might not be the ideal way to query
4) A general idea of the vague score generator algorithm conceptualized.

#### Checkpoints reached as of 8/16 :

Finished up with a sem, put out a lot of fires. Back to work.

So far, 
1) Score feedback loop created
2) Context addition and transformation created
3) Workflow deployed on AWS:EC2
4) Created a LOT of problems with all the progress as well :P
   - The scoring system is not consistent, a more concrete and reliable method must be used
   - Try to make the scoring system a bit more forgiving
   - Consider local LM processing (kinda like cluely)
   - Essentially rework all of `background.js` to figure out what is tweaking
   - The context addition and transformation blows up in my face idk why, look into it
   - Consider fine tuning with an appropriate database
   - Maybe use a model more suited towards logical reasoning.
   
#### Up next:
1) Rework the vague score
2) Worry about the rest after this is ready to go. Restructure `background.js` for sure though

#### Checkpoints reached as of 8/30 :
Product ready for deployment.

Current Issues:
- Finetuning needs more work
- Dataset needs more values
- Shift focus to holism
- Produce a demo


