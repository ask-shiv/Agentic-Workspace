import axe from "axe-core";
import { PreferencesProvider, preferencesKey } from "../src/context/preferences";
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { createMemoryRouter, Link, RouterProvider } from "react-router-dom";
import { ReportWorkspace } from "../src/components/ReportWorkspace";
import { WorkspaceNavigation } from "../src/components/WorkspaceNavigation";
import { useUnsavedNavigation } from "../src/hooks/use-unsaved-navigation";
import { citationKey, citationSearch, pageFromSearch } from "../src/lib/citations";
import { matchQuote, sourceHighlightBoxes } from "../src/lib/pdf-highlight";
import { emptyWorkspace, type Finding } from "../src/lib/workspace";

const originalFetch=globalThis.fetch;
afterEach(() => { cleanup(); localStorage.clear(); globalThis.fetch=originalFetch; });
const finding: Finding={title:'Break notice',interpretation:'Review the notice provision.',relevance:'Exit flexibility',next_step:'Confirm service.',uncertainty:'Facts require review.',page:7,quote:'Notice must be served in writing.',evidence_status:'source_checked'};

test('citations survive whitespace changes and preserve view without exposing quoted text',()=>{
 assert.equal(citationKey(finding),citationKey({...finding,quote:'Notice must be\nserved in writing.'}));
 const search=citationSearch('?view=report',finding);
 assert.equal(new URLSearchParams(search).get('view'),'report');
 assert.equal(pageFromSearch(search,9),7);
 assert(!search.includes('Notice'));
 assert.equal(pageFromSearch('?page=-1'),1);
 assert.equal(pageFromSearch('?page=999',9),9);
});

test('source highlighting locates exact spans without changing original text or markup',()=>{
 const root=document.createElement('div');
 root.innerHTML='<div class="react-pdf__Page__textContent"><span role="presentation">Notice must be</span><br role="presentation"/><span role="presentation">served in writing.</span><span role="presentation">&lt;img src=x onerror=alert(1)&gt;</span></div>';
 const original=root.innerHTML;
 const rangePrototype=Object.getPrototypeOf(document.createRange());
 const originalRects=rangePrototype.getClientRects;
 rangePrototype.getClientRects=()=>[{left:10,top:20,width:90,height:12}];
 try {
  assert.equal(matchQuote(['Notice must be','served in writing.'],finding.quote).size,2);
  assert.equal(sourceHighlightBoxes(root,finding.quote).length,2);
  assert.equal(sourceHighlightBoxes(root,'Notice may be served verbally.').length,0);
  assert.equal(sourceHighlightBoxes(root,'Notice must be...served in writing.').length,0);
  assert.equal(sourceHighlightBoxes(root,'<img src=x onerror=alert(1)>').length,1);
  assert.equal(root.querySelector('img'),null);
  assert.equal(root.innerHTML,original);
 } finally {rangePrototype.getClientRects=originalRects;}
});

test('sidebar links support deep routes and browser history',async()=>{
 const user=userEvent.setup();
 const item={id:'lease-a',title:'New Conversation',document_filename:'Lease A.pdf',created_at:'2026-10-21',updated_at:'2026-10-21',has_document:true};
 const router=createMemoryRouter([{path:'*',element:<WorkspaceNavigation conversations={[item]} loading={false} onCreate={()=>{}}/>}],{initialEntries:['/']});
 render(<RouterProvider router={router}/>);
 await user.click(screen.getByRole('link',{name:/Lease A/}));
 assert.equal(router.state.location.pathname,'/workspaces/lease-a');
 await act(()=>router.navigate(-1));
 assert.equal(router.state.location.pathname,'/');
 await act(()=>router.navigate(1));
 assert.equal(router.state.location.pathname,'/workspaces/lease-a');
 router.dispose();
});

test('unsaved edits block route changes but allow citation query navigation',async()=>{
 let allow=false; const original=window.confirm; window.confirm=()=>allow;
 function Editor(){useUnsavedNavigation(true);return <><Link to='/settings'>Settings</Link><Link to='?source=1&page=7'>Source</Link></>;}
 const router=createMemoryRouter([{path:'/workspaces/a',element:<Editor/>},{path:'/settings',element:<h1>Settings page</h1>}],{initialEntries:['/workspaces/a']});
 render(<RouterProvider router={router}/>); const user=userEvent.setup();
 try {
  await user.click(screen.getByRole('link',{name:'Source'}));
  assert.equal(router.state.location.search,'?source=1&page=7');
  await user.click(screen.getByRole('link',{name:'Settings'}));
  await waitFor(()=>assert([...router.state.blockers.values()].every(blocker=>blocker.state === "unblocked")));
  assert.equal(router.state.location.pathname,'/workspaces/a');
  allow=true; await user.click(screen.getByRole('link',{name:'Settings'}));
  await screen.findByRole('heading',{name:'Settings page'});
 } finally {window.confirm=original;router.dispose();}
});

test('report deep link restores evidence, saves edits and keeps citation navigation',async()=>{
 const saved={...emptyWorkspace(),version:1,intent:'report' as const,findings:[finding],objective:'Review exit flexibility',review_objective:'Review exit flexibility'};
 const requests: string[]=[];
 globalThis.fetch=async (input,init)=>{
  const url=String(input); requests.push(`${init?.method ?? 'GET'} ${url}`);
  if(init?.method==='PUT') return Response.json({...JSON.parse(String(init.body)),version:2});
  return Response.json(saved);
 };
 function Workspace(){const [,setDirty]=useState(false);return <PreferencesProvider><ReportWorkspace conversationId='a' document={{id:'doc',conversation_id:'a',filename:'lease.pdf',page_count:9,uploaded_at:'2026-10-21'}} onDirty={setDirty} onCitation={()=>{}}><p>Document chat</p></ReportWorkspace></PreferencesProvider>;}
 const router=createMemoryRouter([{path:'/workspaces/a',element:<Workspace/>}],{initialEntries:['/workspaces/a']});
 render(<main><h1>Review workspace</h1><RouterProvider router={router}/></main>); const user=userEvent.setup();
 await screen.findByRole('heading',{name:'Break notice'});
 const audit=await axe.run(document.body,{rules:{'color-contrast':{enabled:false},'label-content-name-mismatch':{enabled:false}}});
 assert.deepEqual(audit.violations.map(item=>item.id),[]);
 assert(screen.getByRole('region',{name:'Report builder'}));
 await user.click(screen.getByRole('button',{name:'Add to report'}));
 assert(screen.getByRole('complementary',{name:'Your working report'}).textContent?.includes('1 linked finding'));
 assert(screen.getByRole('status',{name:'Report additions'}).textContent?.includes('Key findings'));
 assert(screen.getByRole('button',{name:'Export PDF'}).hasAttribute('disabled'));
 const section=screen.getByRole('textbox',{name:'Key findings'}) as HTMLTextAreaElement;
 assert(section.value.includes('Review the notice provision.'));
 await user.type(section,' Lawyer decision: request clarification.');
 await user.click(screen.getByRole('button',{name:'Save workspace'}));
 await screen.findByText('Saved revision 2');
 assert(requests.includes('PUT /api/conversations/a/workspace'));
 const evidence=screen.getByRole('region',{name:'Source evidence for Key findings'});
 const link=evidence.querySelector('a') as HTMLAnchorElement;
 assert(link); await user.click(link);
 assert.equal(new URLSearchParams(router.state.location.search).get('citation'),citationKey(finding));
 assert.equal(new URLSearchParams(router.state.location.search).get('view'),'report');
 assert.equal(link.getAttribute('aria-current'),'location');
 assert.equal(evidence.getAttribute('data-source-active'),'true');
 assert(section.value.includes('Lawyer decision'));
 router.dispose();
});


test('reading view preserves report content as selectable text without an editor',async()=>{
 localStorage.setItem(preferencesKey,JSON.stringify({readingMode:true}));
 const saved={...emptyWorkspace(),version:3,objective:'Review exit flexibility',findings:[finding],sections:[{title:'Key findings',content:'Client strategy: preserve exit flexibility.\n\n![remote](https://example.invalid/track)',finding_ids:[0]}]};
 globalThis.fetch=async()=>Response.json(saved);
 const router=createMemoryRouter([{path:'/workspaces/a',element:<PreferencesProvider><ReportWorkspace conversationId='a' document={{id:'doc',conversation_id:'a',filename:'lease.pdf',page_count:9,uploaded_at:'2026-10-21'}} onDirty={()=>{}} onCitation={()=>{}}><p>Document chat</p></ReportWorkspace></PreferencesProvider>}],{initialEntries:['/workspaces/a?view=report']});
 render(<RouterProvider router={router}/>);
 await screen.findByText('Client strategy: preserve exit flexibility.');
 assert.equal(screen.getByRole('article',{name:'Readable report'}).querySelector('img'),null);
 assert.equal(screen.queryByRole('textbox',{name:'Key findings'}),null);
 assert(screen.getAllByRole('link',{name:'Inspect source on PDF page 7'}).length > 0);
 router.dispose();
});


test('a previously confirmed deletion cannot bypass another workspace guard',async()=>{
 const original=window.confirm; let prompts=0;window.confirm=()=>{prompts++;return false;};
 function Editor(){useUnsavedNavigation(true);return <h1>Unsaved review</h1>;}
 const router=createMemoryRouter([{path:'/',element:<h1>Home</h1>},{path:'/workspaces/a',element:<Editor/>}],{initialEntries:[{pathname:'/',state:{deletedWorkspace:'previous-workspace'}},'/workspaces/a']});
 render(<RouterProvider router={router}/>);
 try {
  await act(()=>router.navigate(-1));
  await waitFor(()=>assert.equal(prompts,1));
  assert.equal(router.state.location.pathname,'/workspaces/a');
 } finally {window.confirm=original;router.dispose();}
});


test('unverified source references remain inspectable without claiming they matched',async()=>{
 const unverified={...finding,evidence_status:'unverified' as const};
 const saved={...emptyWorkspace(),version:1,objective:'Check notice',findings:[unverified]};
 let received='';
 globalThis.fetch=async()=>Response.json(saved);
 const router=createMemoryRouter([{path:'*',element:<PreferencesProvider><ReportWorkspace conversationId='a' document={{id:'doc',conversation_id:'a',filename:'lease.pdf',page_count:9,uploaded_at:'2026-10-22'}} onDirty={()=>{}} onCitation={quote=>{received=quote;}}><p>Chat</p></ReportWorkspace></PreferencesProvider>}],{initialEntries:['/workspaces/a?view=risk']});
 render(<RouterProvider router={router}/>);const user=userEvent.setup();
 await user.click(await screen.findByRole('link',{name:'Inspect source on PDF page 7'}));
 await waitFor(()=>assert.equal(received,unverified.quote));
 assert(screen.getByText('Source unverified'));
 await act(()=>router.navigate('/workspaces/a?view=risk&page=8'));
 await waitFor(()=>assert.equal(received,''));
 router.dispose();
});


test('supporting passages retain independent deep links and resolve the selected quotation',async()=>{
 const source={page:8,quote:'A six month premium is payable.',evidence_status:'source_checked' as const};
 const combined={...finding,supporting_evidence:[source]};
 const saved={...emptyWorkspace(),version:1,objective:'Review exit flexibility',review_objective:'Review exit flexibility',findings:[combined]};
 globalThis.fetch=async()=>Response.json(saved);
 let selected='';
 const router=createMemoryRouter([{path:'/workspaces/a',element:<PreferencesProvider><ReportWorkspace conversationId='a' document={{id:'doc',conversation_id:'a',filename:'lease.pdf',page_count:9,uploaded_at:'2026-10-21'}} onDirty={()=>{}} onCitation={quote=>{selected=quote;}}><p>Chat</p></ReportWorkspace></PreferencesProvider>}],{initialEntries:['/workspaces/a?view=risk']});
 render(<RouterProvider router={router}/>);
 const link=await screen.findByRole('link',{name:'Inspect source on PDF page 8'});
 await userEvent.setup().click(link);
 assert.equal(new URLSearchParams(router.state.location.search).get('citation'),citationKey(source));
 await waitFor(()=>assert.equal(selected,source.quote));
 assert.equal(new URLSearchParams(router.state.location.search).get('page'),'8');
 router.dispose();
});
