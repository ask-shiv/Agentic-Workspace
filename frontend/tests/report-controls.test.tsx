import { tenantBrief } from './brief-fixture';
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { useState } from "react";
import { PreferencesProvider } from "../src/context/preferences";
import { ReportWorkspace } from "../src/components/ReportWorkspace";
import { useWorkspaceShortcuts } from "../src/hooks/use-workspace-shortcuts";
import { emptyWorkspace, type Finding } from "../src/lib/workspace";

const originalFetch = globalThis.fetch;
const originalConfirm = window.confirm;
afterEach(() => { cleanup(); localStorage.clear(); globalThis.fetch = originalFetch; window.confirm = originalConfirm; });
const finding: Finding = { title:'Break notice', interpretation:'Check notice.', relevance:'Exit', next_step:'Confirm.', uncertainty:'Review facts.', page:1, quote:'Notice in writing.', evidence_status:'source_checked' };
const current = { ...emptyWorkspace(), version:2, objective:'Current objective', findings:[finding, {...finding, title:'Repair obligation'}], sections:[{title:'Introduction', content:'Current advice', finding_ids:[0]}] };
const older = {...current, version:1, objective:'Earlier objective', sections:[{title:'Introduction', content:'Earlier advice', finding_ids:[0]}]};
function mount(initial="/workspaces/a?view=report") {
 function Workspace(){const [,setDirty] = useState(false); return <PreferencesProvider><ReportWorkspace conversationId='a' document={{id:'d',conversation_id:'a',filename:'lease.pdf',page_count:2,uploaded_at:'2026-10-21'}} onCitation={()=>{}} onDirty={setDirty}><p>Chat</p></ReportWorkspace></PreferencesProvider>;}
 const router = createMemoryRouter([{path:'*',element:<Workspace/>}], {initialEntries:[initial]});
 render(<main><h1>Workspace</h1><RouterProvider router={router}/></main>);
 return router;
}

test('history previews without editing and restores only after confirmation with current version', async()=>{
 const requests: string[]=[]; let restoreBody: unknown;
 globalThis.fetch=async(input,init)=>{
  const url=String(input); requests.push(url);
  if(url.endsWith('/restore')) { restoreBody=JSON.parse(String(init?.body)); return Response.json({...older,version:3}); }
  if(url.endsWith('/revisions')) return Response.json([{version:2,created_at:'2026-10-21T10:00:00Z',objective:current.objective},{version:1,created_at:'2026-10-21T09:00:00Z',objective:older.objective}]);
  if(url.endsWith('/revisions/1')) return Response.json(older);
  return Response.json(current);
 };
 const router=mount(); const user=userEvent.setup();
 await screen.findByText('Saved revision 2');
 await user.type(screen.getByRole('textbox',{name:'Introduction'}),' unsaved edit');
 await user.click(screen.getByRole('button',{name:'Revision 2 · History'}));
 await user.click(await screen.findByRole('button',{name:/Revision 1/}));
 await screen.findByText('Earlier advice');
 assert((screen.getByRole('textbox',{name:'Introduction',hidden:true}) as HTMLTextAreaElement).value.includes('unsaved edit'));
 window.confirm=()=>false;
 await user.click(screen.getByRole('button',{name:'Restore as a new revision'}));
 assert(!requests.some(url=>url.endsWith('/restore')));
 window.confirm=(message)=>{assert(String(message).includes('unsaved edits'));return true;};
 await user.click(screen.getByRole('button',{name:'Restore as a new revision'}));
 await waitFor(()=>assert.equal(screen.queryByRole('dialog'),null));
 assert.deepEqual(restoreBody,{current_version:2});
 assert.equal((screen.getByRole('textbox',{name:'Introduction'}) as HTMLTextAreaElement).value,'Earlier advice');
 await screen.findByText('Saved revision 3');
 router.dispose();
});

test('finding controls and default keyboard navigation focus the requested evidence without changing edits',async()=>{
 globalThis.fetch=async()=>Response.json(current);
 const router=mount(); const user=userEvent.setup();
 await screen.findByText('Saved revision 2');
 assert(screen.getByRole('button',{name:'Previous finding'}).hasAttribute('disabled'));
 await user.click(screen.getByRole('button',{name:'Next finding'}));
 assert.equal(document.activeElement,screen.getByRole('article',{name:'Finding 2: Repair obligation'}));
 fireEvent.keyDown(document.activeElement!,{key:'ArrowUp',altKey:true});
 assert.equal(document.activeElement,screen.getByRole('article',{name:'Finding 1: Break notice'}));
 const editor=screen.getByRole('textbox',{name:'Introduction'});
 await user.click(editor);
 fireEvent.keyDown(editor,{key:'ArrowDown',altKey:true});
 assert.equal(document.activeElement,editor);
 assert.equal((editor as HTMLTextAreaElement).value,'Current advice');
 assert(screen.getByRole('button',{name:'Download report'}));
 await user.click(screen.getByText('Your momentum'));
 assert(screen.getByText(/not measured hours saved/));
 assert.equal(screen.getByRole('progressbar',{name:'Findings marked reviewed'}).getAttribute('value'),'0');
 router.dispose();
});

test('finding shortcuts ignore modal dialogs and busy requests',()=>{
 let moves=0;
 function Shortcuts({busy}:{busy:boolean}) {useWorkspaceShortcuts(false,busy,()=>{},()=>{},()=>{moves++;});return <><button type='button'>Evidence</button><div role='dialog' aria-label='History'><button type='button'>Preview</button></div></>;}
 const view=render(<Shortcuts busy={false}/>);
 fireEvent.keyDown(screen.getByRole('button',{name:'Preview'}),{key:'ArrowDown',altKey:true});assert.equal(moves,0);
 view.rerender(<Shortcuts busy/>);
 fireEvent.keyDown(window,{key:'ArrowDown',altKey:true});assert.equal(moves,0);
});

test('restore conflicts remain visible inside history and leave current work intact', async()=>{
 globalThis.fetch=async(input)=>{
  const url=String(input);
  if(url.endsWith('/restore')) return Response.json({detail:'A newer version exists. Reload the workspace before saving.'},{status:409});
  if(url.endsWith('/revisions')) return Response.json([{version:1,created_at:'2026-10-21T09:00:00Z',objective:older.objective}]);
  if(url.endsWith('/revisions/1')) return Response.json(older);
  return Response.json(current);
 };
 window.confirm=()=>true;
 const router=mount(); const user=userEvent.setup();
 await screen.findByText('Saved revision 2');
 await user.click(screen.getByRole('button',{name:'Revision 2 · History'}));
 await user.click(await screen.findByRole('button',{name:/Revision 1/}));
 await screen.findByText('Earlier advice');
 await user.click(screen.getByRole('button',{name:'Restore as a new revision'}));
 await waitFor(()=>assert(screen.getByRole('dialog').textContent?.includes('A newer version exists')));
 assert.equal((screen.getByRole('textbox',{name:'Introduction',hidden:true}) as HTMLTextAreaElement).value,'Current advice');
 await user.click(screen.getByRole('button',{name:'Close'}));
 assert(screen.getByRole('alert').textContent?.includes('A newer version exists'));
 router.dispose();
});

test('the purpose lock requires confirmation and failed investigation remains retryable', async()=>{
 let attempts=0; let finishReview: ((response: Response)=>void) | undefined;
 const brief={...tenantBrief,objective:current.objective,workflow:"risk" as const};
 const saved={...current,review_objective:current.objective,brief,review_brief:brief,report_brief:brief};
 globalThis.fetch=async(input)=>{
  if(String(input).endsWith('/review')) {
   attempts++;
   if(attempts===1) return Response.json({detail:'Review unavailable. Try again.'},{status:502});
   return new Promise<Response>(resolve=>{finishReview=resolve;});
  }
  return Response.json(saved);
 };
 const router=mount(); const user=userEvent.setup();
 await screen.findByText('Saved revision 2');
 const objective=screen.getByRole('textbox',{name:'What are you trying to achieve?'});
 assert(objective.hasAttribute('disabled'));
 assert(screen.getByRole('button',{name:'Review up to date'}).hasAttribute('disabled'));
 await user.type(screen.getByRole('textbox',{name:'Introduction'}),' Lawyer amendment.');
 assert(screen.getByRole('button',{name:'Review up to date'}).hasAttribute('disabled'));
 await user.click(screen.getByRole('button',{name:'Change purpose'}));assert.equal(document.activeElement,screen.getByRole('button',{name:'Cancel'}));await user.keyboard('{Escape}');assert(objective.hasAttribute('disabled'));
 await user.click(screen.getByRole('button',{name:'Change purpose'}));await user.click(screen.getByRole('button',{name:'Unlock purpose'}));assert(!objective.hasAttribute('disabled'));
 await user.type(objective,'   ');
 assert.equal(screen.queryByText(/Objective changed/),null);
 const submit=screen.getByRole('button',{name:'Investigate brief'});assert(!submit.hasAttribute('disabled'));
 await user.click(submit);await user.click(screen.getByRole('button',{name:'Cancel'}));assert.equal(attempts,0);
 await user.click(submit);await user.click(screen.getByRole('button',{name:'Replace and investigate'}));
 await screen.findByText('Review unavailable. Try again.'); assert(!submit.hasAttribute('disabled'));
 await user.click(submit);await user.click(screen.getByRole('button',{name:'Replace and investigate'}));
 assert(screen.getByRole('button',{name:'Investigating…'}).hasAttribute('disabled'));
 assert(objective.hasAttribute('disabled'));
 assert.equal(attempts,2);
 finishReview?.(Response.json({findings:[finding],gaps:[]}));
 await waitFor(()=>assert(screen.getByRole('button',{name:'Review up to date'}).hasAttribute('disabled')));
 assert(objective.hasAttribute('disabled'));
 assert((screen.getByRole('textbox',{name:'Introduction'}) as HTMLTextAreaElement).value.includes('Lawyer amendment.'));
 router.dispose();
});

test('planning requires agreement before investigation and successful empty reviews still lock the purpose',async()=>{
 let attempts=0;
 globalThis.fetch=async(input,init)=>{
  if(String(input).endsWith('/plan')) return Response.json({...tenantBrief,objective:JSON.parse(String(init?.body)).objective,workflow:JSON.parse(String(init?.body)).workflow});
  if(String(input).endsWith('/review')) {attempts++;return Response.json({findings:[],gaps:['No matching provision found.']});}
  return Response.json({...emptyWorkspace(),version:1});
 };
 const router=mount(); const user=userEvent.setup();
 await screen.findByText('Saved revision 1');
 const submit=screen.getByRole('button',{name:'Suggest a brief'});
 assert(submit.hasAttribute('disabled'));
 await user.type(screen.getByRole('textbox',{name:'What are you trying to achieve?'}),'Review tenant exit rights');
 await user.click(screen.getByRole('radio',{name:/Assess risk/}));
 await user.click(submit);
 await screen.findByRole('dialog',{name:'Agree the brief'}); assert.equal(attempts,0);
 await user.click(screen.getByRole('button',{name:'Agree brief and investigate'}));
 await screen.findByText('No matching provision found.');
 assert(screen.getByRole('button',{name:'Review up to date'}).hasAttribute('disabled'));
 assert(screen.getByRole('textbox',{name:'What are you trying to achieve?'}).hasAttribute('disabled'));
 assert.equal(attempts,1);
 router.dispose();
});


test('master report opens a dedicated view, repeats reliably and preserves edits on return', async()=>{
 globalThis.fetch=async()=>Response.json(current);
 const router=mount('/workspaces/a?view=report&source=1');const user=userEvent.setup();
 const editor=await screen.findByRole('textbox',{name:'Introduction'});
 await user.type(editor,' human edit');
 await user.click(screen.getByRole('button',{name:'Open master report'}));
 const heading=screen.getByRole('heading',{name:'Master report'});
 await waitFor(()=>assert.equal(document.activeElement,heading));
 assert.equal(new URLSearchParams(router.state.location.search).get('report'),'master');
 assert.equal(new URLSearchParams(router.state.location.search).get('source'),null);
 assert.equal(document.querySelector('.workspace-toolbar')?.hasAttribute('hidden'),true);
 assert.equal(document.querySelector('.report-layout')?.getAttribute('data-master'),'true');
 assert.equal((screen.getByRole('textbox',{name:'Introduction'}) as HTMLTextAreaElement).value,'Current advice human edit');
 editor.focus();
 await user.click(screen.getByRole('button',{name:'Open master report'}));
 await waitFor(()=>assert.equal(document.activeElement,heading));
 await user.click(screen.getByRole('button',{name:'Back to findings'}));
 assert.equal(new URLSearchParams(router.state.location.search).get('view'),'risk');
 assert.equal(new URLSearchParams(router.state.location.search).get('report'),null);
 await user.click(screen.getByRole('button',{name:'Open master report'}));
 assert.equal((screen.getByRole('textbox',{name:'Introduction'}) as HTMLTextAreaElement).value,'Current advice human edit');
 router.dispose();
});

for (const readingMode of [false,true]) {
 test(`pointer drag links the actual destination and preserves other sections (reading=${readingMode})`,async()=>{
  localStorage.setItem('agentic-workspace:preferences:v1',JSON.stringify({readingMode}));
  const saved={...current,sections:[...current.sections,{title:'Next steps',content:'Human notes',finding_ids:[]}]};
  globalThis.fetch=async()=>Response.json(saved);
  const originalPointer=window.PointerEvent;const originalHit=document.elementFromPoint;
  Object.defineProperty(window,'PointerEvent',{configurable:true,value:window.MouseEvent});
  const router=mount();
  try {
   const handle=await screen.findByRole('button',{name:'Drag Repair obligation to a report section'});
   handle.setPointerCapture=()=>{};handle.hasPointerCapture=()=>false;
   const destination=screen.getByRole('region',{name:'Report section: Next steps'});
   document.elementFromPoint=()=>destination.querySelector('textarea')??destination;
   const down=()=>fireEvent.pointerDown(handle,{button:0,clientX:10,clientY:10,pointerId:1});
   const move=()=>fireEvent.pointerMove(handle,{clientX:100,clientY:100,pointerId:1});
   const up=()=>fireEvent.pointerUp(handle,{clientX:100,clientY:100,pointerId:1});
   const initial=destination.textContent;
   down();move();fireEvent.keyDown(handle,{key:'Escape'});up();assert.equal(destination.textContent,initial);
   document.elementFromPoint=()=>document.body;down();move();up();assert.equal(destination.textContent,initial);
   document.elementFromPoint=()=>destination.querySelector('textarea')??destination;
   down();move();assert.equal(destination.getAttribute('data-drag-over'),'true');up();
   assert.equal(destination.getAttribute('data-drag-over'),'false');
   assert.match(screen.getByLabelText('Report additions').textContent??'',/Added “Repair obligation” to Next steps/);
   if (!readingMode) {
    assert.equal((screen.getByRole('textbox',{name:'Introduction'}) as HTMLTextAreaElement).value,'Current advice');
    assert.match((screen.getByRole('textbox',{name:'Next steps'}) as HTMLTextAreaElement).value,/Human notes\n\nRepair obligation/);
   } else assert.match(destination.textContent??'',/Human notes.*Repair obligation/s);
   const before=destination.textContent;
   down();move();up();assert.equal(destination.textContent,before);
  } finally {router.dispose();Object.defineProperty(window,'PointerEvent',{configurable:true,value:originalPointer});document.elementFromPoint=originalHit;}
 });
}
