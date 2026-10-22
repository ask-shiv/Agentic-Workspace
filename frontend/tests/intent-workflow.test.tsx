import assert from 'node:assert/strict';
import {afterEach,test} from 'node:test';
import {cleanup,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter,RouterProvider} from 'react-router-dom';
import {ReportWorkspace} from '../src/components/ReportWorkspace';
import {PreferencesProvider} from '../src/context/preferences';
import {briefKey,emptyWorkspace,reportIsCurrent,reviewIsCurrent,type TaskContext,type WorkspaceData,type Finding} from '../src/lib/workspace';
import {tenantBrief} from './brief-fixture';
const originalFetch=globalThis.fetch, originalConfirm=window.confirm;
afterEach(()=>{cleanup();localStorage.clear();globalThis.fetch=originalFetch;window.confirm=originalConfirm;});
const finding:Finding={title:'Conditional break',interpretation:'Review the conditions.',relevance:'Exit',next_step:'Obtain records.',uncertainty:'Compliance is unknown.',page:1,quote:'Written notice is required.',evidence_status:'source_checked'};
function mount(){const router=createMemoryRouter([{path:'*',element:<PreferencesProvider><ReportWorkspace conversationId='a' document={{id:'d',conversation_id:'a',filename:'lease.pdf',page_count:2,uploaded_at:'2026-10-22'}} onCitation={()=>{}} onDirty={()=>{}}>{context=><output data-testid='chat-context'>{JSON.stringify(context)}</output>}</ReportWorkspace></PreferencesProvider>}],{initialEntries:['/workspaces/a?view=report']});const view=render(<main><h1>Workspace</h1><RouterProvider router={router}/></main>);return {router,view};}

test('brief planning, protected outline replacement, drafting and reload share the same task',async()=>{
 let server:WorkspaceData={...emptyWorkspace(),version:2,objective:'Earlier objective',review_objective:'Earlier objective',findings:[finding],sections:[{title:'Introduction',content:'Preserve my earlier advice.',finding_ids:[0]}]};
 const calls:{action:string;body:Record<string,unknown>}[]=[];
 globalThis.fetch=async(input,init)=>{
  const action=String(input).split('/').at(-1)??'';const body=init?.body?JSON.parse(String(init.body)):{};
  if(init?.method!=='GET' && init?.body) calls.push({action,body});
  if(action==='plan')return Response.json({...tenantBrief,objective:body.objective,workflow:body.workflow});
  if(action==='review')return Response.json({findings:[finding],gaps:['Need service records.']});
  if(action==='draft')return Response.json({content:'Proposed client advice. [PDF page 1]'});
  if(init?.method==='PUT'){server={...body,version:server.version+1};return Response.json(server);}
  return Response.json(server);
 };
 window.confirm=()=>{throw new Error("Native confirmation must not run for intent changes");};const user=userEvent.setup();const first=mount();
 await screen.findByText('Saved revision 2');
 await user.click(screen.getByRole('button',{name:'Change purpose'}));await user.click(await screen.findByRole('button',{name:'Unlock purpose'}));
 const objective=screen.getByRole('textbox',{name:'What are you trying to achieve?'});
 await user.clear(objective);await user.type(objective,tenantBrief.objective);await user.click(screen.getByRole('button',{name:'Plan my work'}));
 await screen.findByRole('dialog',{name:'Agree the brief'});
 assert.equal((screen.getByRole('textbox',{name:'Introduction',hidden:true}) as HTMLTextAreaElement).value,'Preserve my earlier advice.');
 assert(!calls.some(call=>call.action==='review'));
 const outcome=screen.getByRole('textbox',{name:'Intended outcome'});await user.clear(outcome);await user.type(outcome,'Prepare a short client update on 2029 exit feasibility.');
 await user.click(screen.getByRole('button',{name:'Agree brief and investigate'}));await user.click(await screen.findByRole('button',{name:'Replace and investigate'}));
 await screen.findByRole('button',{name:'Review up to date'});
 const attention=screen.getByText('Needs your attention').closest('details');assert(attention);assert(attention.closest('header'));assert.equal(attention.open,false);await user.click(screen.getByText('Needs your attention'));assert(screen.getByText('Need service records.'));
 const agreed=calls.find(call=>call.action==='review')?.body.brief as typeof tenantBrief;
 assert.equal(agreed.outcome,'Prepare a short client update on 2029 exit feasibility.');
 assert.equal((screen.getByRole('textbox',{name:'Introduction'}) as HTMLTextAreaElement).value,'Preserve my earlier advice.');
 assert(screen.getByRole('button',{name:'Propose a draft'}).hasAttribute('disabled'));
 await user.click(screen.getByRole('button',{name:'Use this report outline'}));await user.click(screen.getByRole('button',{name:'Cancel'}));assert(screen.getByRole('textbox',{name:'Introduction'}));
 await user.click(screen.getByRole('button',{name:'Use this report outline'}));await user.click(screen.getByRole('button',{name:'Save and apply outline'}));
 await screen.findByRole('textbox',{name:'Exit feasibility'});
 const snapshot=calls.find(call=>call.action==='workspace');assert(snapshot);const preserved=(snapshot.body.sections as {content:string}[])[0];assert(preserved);assert(preserved.content.includes('Preserve my earlier advice.'));
 await user.click(screen.getByRole('button',{name:'Add to report'}));
 const drafts=screen.getAllByRole('button',{name:'Propose a draft'});assert(drafts[1]);await user.click(drafts[1]);
 await screen.findByText('Proposed client advice. [PDF page 1]');
 const draft=calls.find(call=>call.action==='draft')?.body;
 assert.equal(briefKey(draft?.brief as typeof tenantBrief),briefKey(agreed));assert.equal(briefKey(draft?.review_brief as typeof tenantBrief),briefKey(agreed));assert.equal(briefKey(draft?.report_brief as typeof tenantBrief),briefKey(agreed));
 assert((screen.getByRole('textbox',{name:'Conditions to resolve'}) as HTMLTextAreaElement).value.includes('Review the conditions.'));
 await user.click(screen.getByRole('button',{name:'Accept amendment'}));await user.click(screen.getByRole('button',{name:'Save workspace'}));
 await screen.findByText('Saved revision 4');
 const context=JSON.parse(screen.getByTestId('chat-context').textContent??'{}') as TaskContext;assert.equal(briefKey(context.brief),briefKey(agreed));assert.equal(context.blocked,false);
 first.view.unmount();first.router.dispose();const second=mount();
 await screen.findByText('Saved revision 4');assert(screen.getByRole('textbox',{name:'What are you trying to achieve?'}).hasAttribute('disabled'));
 assert.equal((screen.getByRole('textbox',{name:'Conditions to resolve'}) as HTMLTextAreaElement).value,'Proposed client advice. [PDF page 1]');
 await user.click(screen.getByRole('button',{name:'Change purpose'}));await user.click(await screen.findByRole('button',{name:'Unlock purpose'}));assert(screen.getByRole('button',{name:'Download report'}).hasAttribute('disabled'));assert(JSON.parse(screen.getByTestId('chat-context').textContent??'{}').blocked);
 await user.click(screen.getByRole('button',{name:'Save workspace'}));await screen.findByText('Saved revision 5');assert(server.purpose_unlocked);second.router.dispose();
});

test('drift detection compares role and outcome as well as the objective, and unlocking forces reinvestigation',()=>{
 const data={...emptyWorkspace(),objective:tenantBrief.objective,brief:tenantBrief,review_brief:tenantBrief,report_brief:tenantBrief,review_objective:tenantBrief.objective};assert(reviewIsCurrent(data));assert(reportIsCurrent(data));
 assert(!reviewIsCurrent({...data,purpose_unlocked:true}));assert(!reviewIsCurrent({...data,brief:{...tenantBrief,client_role:'landlord'}}));assert(!reportIsCurrent({...data,report_brief:{...tenantBrief,outcome:'A different task outcome'}}));
});
