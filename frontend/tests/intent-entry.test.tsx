import assert from 'node:assert/strict';
import {afterEach,test} from 'node:test';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {createMemoryRouter,Outlet,RouterProvider} from 'react-router-dom';
import {WorkspaceHome} from '../src/pages/WorkspaceHome';
import {AppShell} from '../src/layouts/AppShell';
import {ReportWorkspace} from '../src/components/ReportWorkspace';
import {WorkspaceNavigation} from '../src/components/WorkspaceNavigation';
import {PreferencesProvider,preferencesKey} from '../src/context/preferences';
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
  if(url.endsWith('/plan')) return Response.json({...tenantBrief,objective:body.objective,workflow:body.workflow,time_pressure:body.time_pressure===true});
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
 assert.equal(calls.find(call=>call.url.endsWith('/plan'))?.body.time_pressure ?? false,false);
 assert(!calls.some(call=>call.url.endsWith('/review')));
 await user.click(screen.getByRole('button',{name:'Agree brief and investigate'}));
 await screen.findByRole('heading',{name:'Notice condition'});
 const review=calls.find(call=>call.url.endsWith('/review'))?.body;
 assert.equal((review?.brief as typeof tenantBrief & {time_pressure:boolean}).time_pressure,false);assert.equal((review?.brief as typeof tenantBrief).workflow,'report');assert.equal(review?.objective,goal);
 router.dispose();
});

test('sidebar view navigation preserves the chosen workflow and unsaved report judgment',async()=>{
 const brief={...tenantBrief,workflow:'risk' as const};
 const saved:WorkspaceData={...emptyWorkspace(),version:1,workflow:'risk',objective:brief.objective,review_objective:brief.objective,brief,review_brief:brief,report_brief:brief,findings:[finding]};
 globalThis.fetch=async()=>Response.json(saved);
 const router=createMemoryRouter([{path:'*',element:<PreferencesProvider><div data-workspace-shell><WorkspaceNavigation conversations={[]} loading={false} onCreate={()=>{}}/><ReportWorkspace conversationId='a' document={doc} onDirty={()=>{}} onCitation={()=>{}}>{context=><output data-testid='context'>{JSON.stringify(context)}</output>}</ReportWorkspace></div></PreferencesProvider>}],{initialEntries:['/workspaces/a?view=report']});
 render(<RouterProvider router={router}/>);const user=userEvent.setup();
 const editor=await screen.findByRole('textbox',{name:'Introduction'});await user.type(editor,'My negotiating decision.');
 await user.click(screen.getByRole('link',{name:'Write report'}));
 await waitFor(()=>assert.equal(document.activeElement?.id,'view-report'));
 await user.click(screen.getByRole('link',{name:'Review findings'}));
 assert.equal(document.activeElement?.id,'view-risk');
 assert.equal(new URLSearchParams(router.state.location.search).get('view'),'risk');
 await user.click(screen.getByRole('link',{name:'Write report'}));
 assert.equal(document.activeElement?.id,'view-report');
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


test('fresh arrival is blank and remembers only a real local profile name',async()=>{
 localStorage.setItem(preferencesKey,JSON.stringify({name:'Shiv McKenzie'}));
 let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({id:'a'});};
 const router=createMemoryRouter([{element:<PreferencesProvider><Outlet context={{refreshConversations:async()=>{},createWorkspace:async()=>{}}}/></PreferencesProvider>,children:[{path:'/',element:<WorkspaceHome/>}]}],{initialEntries:['/']});
 render(<RouterProvider router={router}/>);const user=userEvent.setup();
 assert(screen.getByText('Welcome back, Shiv.'));
 assert.equal(screen.queryByRole('checkbox',{name:/pressed for time/}),null);
 assert(screen.getByRole('heading',{name:'What are you trying to achieve?'}));
 assert.equal((screen.getByRole('textbox') as HTMLTextAreaElement).value,'');
 assert((screen.getByRole('radio',{name:/Build report/}) as HTMLInputElement).checked);
 assert(!screen.getByRole('button',{name:'Continue'}).hasAttribute('disabled'));
 await user.type(screen.getByRole('textbox'),'Review commercial risks');
 await act(()=>router.navigate('/'));
 await waitFor(()=>assert.equal((screen.getByRole('textbox') as HTMLTextAreaElement).value,''));
 assert.equal(calls,0);router.dispose();
});

test('upload first shows document context then asks for an objective before model calls',async()=>{
 const calls:string[]=[];
 globalThis.fetch=async(input)=>{calls.push(String(input));return Response.json(String(input)==='/api/conversations'?{id:'a'}:emptyWorkspace());};
 function Context(){const [attached,setAttached]=useState(false);return <ReportWorkspace conversationId='a' document={attached?doc:null} onUpload={()=>setAttached(true)} onDirty={()=>{}} onCitation={()=>{}}><p>Chat</p></ReportWorkspace>;}
 const router=createMemoryRouter([{element:<PreferencesProvider><Outlet context={{refreshConversations:async()=>{},createWorkspace:async()=>{}}}/></PreferencesProvider>,children:[{path:'/',element:<WorkspaceHome/>},{path:'/workspaces/a',element:<Context/>}]}],{initialEntries:['/']});
 render(<RouterProvider router={router}/>);const user=userEvent.setup();
 await user.upload(screen.getByLabelText('Choose PDF document'),new File(['pdf'],'lease.pdf',{type:'application/pdf'}));
 await screen.findByRole('heading',{name:'Add a document for context'});
 const fileInput=document.querySelector('input[type="file"]') as HTMLInputElement;
 await user.upload(fileInput,new File(['synthetic'],'lease.pdf',{type:'application/pdf'}));
 await screen.findByRole('region',{name:'Uploaded document context'});
 assert(screen.getByText(/lease.pdf · 3 pages/));
 assert.equal((screen.getByRole('textbox') as HTMLTextAreaElement).value,'');
 assert(!screen.getByRole('button',{name:'Suggest a brief'}).hasAttribute('disabled'));
 assert.equal(screen.queryByRole('checkbox',{name:/pressed for time/}),null);
 assert(!calls.some(url=>url.endsWith('/plan')||url.endsWith('/review')));router.dispose();
});


test('setup sidebar explains the next step instead of offering inert view links',()=>{
 const router=createMemoryRouter([{path:'*',element:<WorkspaceNavigation conversations={[]} workspaceStage='setup' loading={false} onCreate={()=>{}}/>}],{initialEntries:['/workspaces/a?view=chat']});
 render(<RouterProvider router={router}/>);
 assert.equal(screen.queryByRole('link',{name:'Document questions'}),null);
 assert(screen.getByText(/Agree your objective and investigate/));
 assert(screen.getByRole('button',{name:'Start new work'}));
 assert(screen.getByText('Choose a goal and add a document.'));
 router.dispose();
});


test('narrow navigation stays visible and expands inline while starting fresh work',async()=>{
 const originalMedia=window.matchMedia;
 window.matchMedia=query=>({...originalMedia(query),matches:false});
 globalThis.fetch=async()=>Response.json([]);
 const router=createMemoryRouter([{element:<PreferencesProvider><AppShell/></PreferencesProvider>,children:[{path:'/',element:<WorkspaceHome/>}]}],{initialEntries:['/']});
 try {
  render(<RouterProvider router={router}/>);const user=userEvent.setup();
  const nav=screen.getByRole('navigation',{name:'Workspace navigation'});
  assert.equal(nav.getAttribute('data-collapsed'),'true');
  await user.click(screen.getByRole('button',{name:'Expand workspace navigation'}));
  assert.equal(nav.getAttribute('data-collapsed'),'false');
  assert.equal(screen.queryByRole('dialog',{name:'Workspaces'}),null);
  await user.type(screen.getByRole('textbox',{name:'What are you trying to achieve?'}),'A different objective');
  await user.click(screen.getByRole('button',{name:'Start new work'}));
  assert.equal((screen.getByRole('textbox',{name:'What are you trying to achieve?'}) as HTMLTextAreaElement).value,'');
  assert.equal(nav.getAttribute('data-collapsed'),'false');
  await user.click(screen.getByRole('button',{name:'Collapse workspace navigation'}));
  assert.equal(nav.getAttribute('data-collapsed'),'true');
  assert(screen.getByRole('link',{name:'Home'}));
  assert(screen.getByRole('link',{name:'Settings & accessibility'}));
 } finally {router.dispose();window.matchMedia=originalMedia;}
});


test('sidebar highlights the resumed saved view when the bookmark has no view query',()=>{
 const router=createMemoryRouter([{path:'*',element:<WorkspaceNavigation conversations={[]} currentView='report' workspaceStage='working' loading={false} onCreate={()=>{}}/>}],{initialEntries:['/workspaces/a']});
 render(<RouterProvider router={router}/>);
 assert.equal(screen.getByRole('link',{name:'Write report'}).getAttribute('aria-current'),'page');
 assert.equal(screen.getByRole('link',{name:'Review findings'}).getAttribute('aria-current'),null);
 router.dispose();
});

test('document chat starts without a risk objective and exposes chat before investigation', async()=>{
 globalThis.fetch=async(input)=>Response.json(String(input)==='/api/conversations'?{id:'a'}:emptyWorkspace());
 const router=createMemoryRouter([{element:<PreferencesProvider><Outlet context={{refreshConversations:async()=>{}}}/></PreferencesProvider>,children:[{path:'/',element:<WorkspaceHome/>},{path:'/workspaces/a',element:<ReportWorkspace conversationId='a' document={null} onDirty={()=>{}} onCitation={()=>{}}><p>Document chat upload and questions</p></ReportWorkspace>}]}],{initialEntries:['/']});
 render(<RouterProvider router={router}/>);const user=userEvent.setup();
 await user.click(screen.getByRole('radio',{name:'Document chat'}));
 await user.click(screen.getByRole('button',{name:'Continue to document chat'}));
 await screen.findByText('Document chat upload and questions');
 assert.equal(router.state.location.search,'?view=chat');
 assert(screen.getByRole('button',{name:'Set an objective instead'}));
});


test('landing dropzone uploads a PDF with the selected report workflow and rejects multiple files',async()=>{
 const calls:string[]=[];
 globalThis.fetch=async(input)=>{calls.push(String(input));return Response.json({id:'a'});};
 const router=createMemoryRouter([{element:<PreferencesProvider><Outlet context={{refreshConversations:async()=>{}}}/></PreferencesProvider>,children:[{path:'/',element:<WorkspaceHome/>},{path:'/workspaces/a',element:<p>Uploaded workspace</p>}]}],{initialEntries:['/']});
 render(<RouterProvider router={router}/>);
 const zone=screen.getByRole('region',{name:'Document dropzone'});
 const file=new File(['synthetic'],'lease.pdf',{type:'application/pdf'});
 fireEvent.drop(zone,{dataTransfer:{files:[file,file]}});
 assert(screen.getByRole('alert'));assert.equal(calls.length,0);
 fireEvent.drop(zone,{dataTransfer:{files:[file]}});
 await screen.findByText('Uploaded workspace');
 assert.deepEqual(calls,['/api/conversations','/api/conversations/a/documents']);
 assert.equal(router.state.location.state.initialIntent.workflow,'report');
 assert.equal(router.state.location.state.startWithUpload,true);
});

test('blank objective can be proposed but still requires agreement before investigation',async()=>{
 const calls:string[]=[];
 const inferred='Prepare a lease negotiation briefing for client discussion.';
 globalThis.fetch=async(input)=>{const url=String(input);calls.push(url);if(url.endsWith('/plan'))return Response.json({...tenantBrief,objective:inferred,outcome:inferred});return Response.json(emptyWorkspace());};
 const router=createMemoryRouter([{path:'*',element:<PreferencesProvider><ReportWorkspace conversationId='a' document={doc} onDirty={()=>{}} onCitation={()=>{}}><p>Chat</p></ReportWorkspace></PreferencesProvider>}],{initialEntries:['/workspaces/a']});
 render(<RouterProvider router={router}/>);const user=userEvent.setup();
 await user.click(await screen.findByRole('radio',{name:/Build report/}));
 assert(screen.getByPlaceholderText('(Optional) Tell me what you’re working towards…'));
 await user.click(screen.getByRole('button',{name:'Suggest a brief'}));
 await screen.findByRole('button',{name:'Agree brief and investigate'});
 assert.equal((document.querySelector('#objective') as HTMLTextAreaElement).value,inferred);
 assert(!calls.some(url=>url.endsWith('/review')));
});


test('desktop navigation collapses into a labelled rail without changing the route',async()=>{
 globalThis.fetch=async()=>Response.json([{id:'a',title:'Tenant exit review',has_document:true}]);
 const router=createMemoryRouter([{element:<PreferencesProvider><AppShell/></PreferencesProvider>,children:[{path:'/',element:<WorkspaceHome/>}]}],{initialEntries:['/']});
 render(<RouterProvider router={router}/>);const user=userEvent.setup();
 const link=await screen.findByRole('link',{name:'Tenant exit review'});
 const nav=screen.getByRole('navigation',{name:'Workspace navigation'});
 assert.equal(nav.getAttribute('data-collapsed'),'false');
 await user.click(screen.getByRole('button',{name:'Collapse workspace navigation'}));
 assert.equal(nav.getAttribute('data-collapsed'),'true');
 assert.equal(link.getAttribute('href'),'/workspaces/a');
 assert.equal(link.getAttribute('title'),'Tenant exit review');
 assert.equal(router.state.location.pathname,'/');
 await user.click(screen.getByRole('button',{name:'Expand workspace navigation'}));
 assert.equal(nav.getAttribute('data-collapsed'),'false');
 router.dispose();
});


test('planning shows accessible pending feedback until the proposed brief arrives',async()=>{
 let finish!: (value:Response)=>void;
 let finishReview!: (value:Response)=>void;
 globalThis.fetch=async input=>String(input).endsWith('/plan')?new Promise<Response>(resolve=>{finish=resolve;}):String(input).endsWith('/review')?new Promise<Response>(resolve=>{finishReview=resolve;}):Response.json({...emptyWorkspace(),objective:tenantBrief.objective,workflow:'report'});
 const router=createMemoryRouter([{path:'*',element:<PreferencesProvider><ReportWorkspace conversationId='a' document={doc} onDirty={()=>{}} onCitation={()=>{}}><p>Chat</p></ReportWorkspace></PreferencesProvider>}],{initialEntries:['/workspaces/a']});
 render(<RouterProvider router={router}/>);const user=userEvent.setup();
 const submit=await screen.findByRole('button',{name:'Plan my work'});
 await user.click(submit);
 const pending=screen.getByRole('button',{name:'Planning your work…'});
 assert.equal(pending.getAttribute('aria-busy'),'true');
 assert(pending.hasAttribute('disabled'));
 assert(pending.querySelector('.planning-spinner'));
 assert(screen.getByRole('status',{name:'Brief preparation'}).textContent?.includes('Preparing a brief'));
 await act(async()=>finish(Response.json({...tenantBrief,workflow:"report"})));
 await screen.findByRole('dialog',{name:'Agree the brief'});
 assert.equal(screen.queryByRole('status',{name:'Brief preparation'}),null);
 assert.equal(submit.getAttribute('aria-busy'),'false');
 await user.click(screen.getByRole('button',{name:'Agree brief and investigate'}));
 const investigating=screen.getByRole('status',{name:'Investigation progress'});
 assert(investigating.textContent?.includes('Investigating your agreed brief'));
 assert(investigating.textContent?.includes('keep this workspace open'));
 assert(investigating.querySelector('.planning-spinner'));
 const investigateButton=screen.getByRole('button',{name:'Investigating…'});
 assert(investigateButton.hasAttribute('disabled'));
 await act(async()=>finishReview(Response.json({findings:[],gaps:[]})));
 assert.equal(screen.queryByText('Investigating your agreed brief…'),null);
 router.dispose();
});


test('failed planning clears loading feedback and leaves preparation retryable',async()=>{
 globalThis.fetch=async input=>String(input).endsWith('/plan')?Response.json({detail:'Planning temporarily unavailable'},{status:503}):Response.json({...emptyWorkspace(),objective:tenantBrief.objective,workflow:'report'});
 const router=createMemoryRouter([{path:'*',element:<PreferencesProvider><ReportWorkspace conversationId='a' document={doc} onDirty={()=>{}} onCitation={()=>{}}><p>Chat</p></ReportWorkspace></PreferencesProvider>}],{initialEntries:['/workspaces/a']});
 render(<RouterProvider router={router}/>);const user=userEvent.setup();
 await user.click(await screen.findByRole('button',{name:'Plan my work'}));
 await screen.findByRole('alert');
 assert.equal(screen.queryByRole('status',{name:'Brief preparation'}),null);
 assert(!screen.getByRole('button',{name:'Plan my work'}).hasAttribute('disabled'));
 router.dispose();
});
