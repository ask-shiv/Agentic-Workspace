import assert from 'node:assert/strict';
import {afterEach,test} from 'node:test';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {createMemoryRouter,Outlet,RouterProvider} from 'react-router-dom';
import {WorkspaceHome} from '../src/pages/WorkspaceHome';
import {ReportWorkspace} from '../src/components/ReportWorkspace';
import {WorkspaceNavigation} from '../src/components/WorkspaceNavigation';
import {PreferencesProvider} from '../src/context/preferences';
import {emptyWorkspace,type WorkspaceData,type Finding} from '../src/lib/workspace';
import {tenantBrief} from './brief-fixture';
const originalFetch=globalThis.fetch;
afterEach(()=>{cleanup();localStorage.clear();globalThis.fetch=originalFetch;});
const doc={id:'d',conversation_id:'a',filename:'lease.pdf',page_count:3,uploaded_at:'2026-10-22'};
const finding:Finding={title:'Notice condition',interpretation:'Check the notice.',relevance:'Negotiation',next_step:'Obtain records',page:1,quote:'Written notice is required.',uncertainty:'Compliance unknown',evidence_status:'source_checked'};

test('a report objective survives intent-first arrival and adding document context without entering the URL',async()=>{
 const goal='I advise a tenant. Prepare a concise commercial-risk negotiation update.';
 const calls:{url:string;body:Record<string,unknown>}[]=[];
 globalThis.fetch=async(input,init)=>{
  const url=String(input);const body=init?.body?JSON.parse(String(init.body)):{};
  if(init?.body) calls.push({url,body});
  if(url==='/api/conversations') return Response.json({id:'a'});
  if(url.endsWith('/plan')) return Response.json({...tenantBrief,objective:body.objective,workflow:body.workflow});
  if(url.endsWith('/review')) return Response.json({findings:[finding],gaps:['Confirm the client’s negotiating priorities.']});
  return Response.json(emptyWorkspace());
 };
 function Context(){const [attached,setAttached]=useState(false);return <ReportWorkspace conversationId='a' document={attached?doc:null} onDirty={()=>{}} onCitation={()=>{}}><button type='button' onClick={()=>setAttached(true)}>Attach test context</button></ReportWorkspace>;}
 const router=createMemoryRouter([{element:<PreferencesProvider><Outlet context={{refreshConversations:async()=>{},createWorkspace:async()=>{}}}/></PreferencesProvider>,children:[{path:'/',element:<WorkspaceHome/>},{path:'/workspaces/a',element:<Context/>}]}],{initialEntries:['/']});
 render(<RouterProvider router={router}/>);const user=userEvent.setup();
 await user.click(screen.getByRole('radio',{name:/Build report/}));
 await user.type(screen.getByRole('textbox',{name:'What are you trying to achieve?'}),goal);
 await user.click(screen.getByRole('button',{name:'Continue with this objective'}));
 await screen.findByRole('heading',{name:goal});
 assert.equal(router.state.location.search,'');assert.equal(calls.length,1);
 await user.click(screen.getByRole('button',{name:'Attach test context'}));
 assert.equal((screen.getByRole('textbox',{name:'What are you trying to achieve?'}) as HTMLTextAreaElement).value,goal);
 assert((screen.getByRole('radio',{name:/Build report/}) as HTMLInputElement).checked);
 await user.click(screen.getByRole('button',{name:'Plan my work'}));
 await screen.findByRole('dialog',{name:'Agree the brief'});
 assert.equal(calls.find(call=>call.url.endsWith('/plan'))?.body.workflow,'report');
 assert(!calls.some(call=>call.url.endsWith('/review')));
 await user.click(screen.getByRole('button',{name:'Agree brief and investigate'}));
 await screen.findByRole('heading',{name:'Notice condition'});
 const review=calls.find(call=>call.url.endsWith('/review'))?.body;
 assert.equal((review?.brief as typeof tenantBrief).workflow,'report');assert.equal(review?.objective,goal);
 router.dispose();
});

test('sidebar view navigation preserves the chosen workflow and unsaved report judgment',async()=>{
 const brief={...tenantBrief,workflow:'risk' as const};
 const saved:WorkspaceData={...emptyWorkspace(),version:1,workflow:'risk',objective:brief.objective,review_objective:brief.objective,brief,review_brief:brief,report_brief:brief,findings:[finding]};
 globalThis.fetch=async()=>Response.json(saved);
 const router=createMemoryRouter([{path:'*',element:<PreferencesProvider><div data-workspace-shell><WorkspaceNavigation conversations={[]} loading={false} onCreate={()=>{}}/><ReportWorkspace conversationId='a' document={doc} onDirty={()=>{}} onCitation={()=>{}}>{context=><output data-testid='context'>{JSON.stringify(context)}</output>}</ReportWorkspace></div></PreferencesProvider>}],{initialEntries:['/workspaces/a?view=report']});
 render(<RouterProvider router={router}/>);const user=userEvent.setup();
 const editor=await screen.findByRole('textbox',{name:'Introduction'});await user.type(editor,'My negotiating decision.');
 await user.click(screen.getByRole('link',{name:'Evidence & findings'}));
 assert.equal(new URLSearchParams(router.state.location.search).get('view'),'risk');
 await user.click(screen.getByRole('link',{name:'Working report'}));
 assert.equal((screen.getByRole('textbox',{name:'Introduction'}) as HTMLTextAreaElement).value,'My negotiating decision.');
 assert.equal(JSON.parse(screen.getByTestId('context').textContent??'{}').brief.workflow,'risk');
 await user.click(screen.getByText('Workspace tools'));
 await waitFor(()=>assert(screen.getByRole('button',{name:'Save workspace'}).closest('#workspace-actions')));
 router.dispose();
});

test('changing workflow for the same objective requires a new agreed investigation',async()=>{
 const brief={...tenantBrief,workflow:'risk' as const};
 const saved:WorkspaceData={...emptyWorkspace(),version:1,workflow:'risk',objective:brief.objective,review_objective:brief.objective,brief,review_brief:brief,report_brief:brief,findings:[finding]};
 const plans:Record<string,unknown>[]=[];
 globalThis.fetch=async(input,init)=>{
  if(String(input).endsWith('/plan')) {const body=JSON.parse(String(init?.body));plans.push(body);return Response.json({...brief,workflow:body.workflow,deliverable:'client_update'});}
  return Response.json(saved);
 };
 const router=createMemoryRouter([{path:'*',element:<PreferencesProvider><ReportWorkspace conversationId='a' document={doc} onDirty={()=>{}} onCitation={()=>{}}>{context=><output data-testid='context'>{JSON.stringify(context)}</output>}</ReportWorkspace></PreferencesProvider>}],{initialEntries:['/workspaces/a?view=report']});
 render(<RouterProvider router={router}/>);const user=userEvent.setup();await screen.findByText('Saved revision 1');
 await user.click(screen.getByRole('button',{name:'Change purpose'}));await user.click(screen.getByRole('button',{name:'Unlock purpose'}));
 await user.click(screen.getByRole('radio',{name:/Build report/}));
 assert(JSON.parse(screen.getByTestId('context').textContent??'{}').blocked);
 assert(screen.getAllByRole('button',{name:'Propose a draft'}).every(button=>button.hasAttribute('disabled')));
 await user.click(screen.getByRole('button',{name:'Plan my work'}));await screen.findByRole('dialog',{name:'Agree the brief'});
 assert.deepEqual(plans,[{objective:brief.objective,workflow:'report'}]);router.dispose();
});
