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
import { matchQuote, renderHighlighted } from "../src/lib/pdf-highlight";
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

test('source highlighting spans PDF text items and escapes document HTML',()=>{
 const ranges=matchQuote(['Notice must be','served in writing.'],'Notice must be served in writing.');
 assert.equal(ranges.size,2);
 assert(renderHighlighted('Notice must be',ranges.get(0)).includes('<mark>Notice must be</mark>'));
 assert.equal(matchQuote(['Different text'],finding.quote).size,0);
 assert(!renderHighlighted('<img src=x onerror=alert(1)>',{start:0,end:26}).includes('<img'));
});

test('sidebar links support deep routes and browser history',async()=>{
 const user=userEvent.setup();
 const item={id:'lease-a',title:'Lease A',created_at:'2026-10-21',updated_at:'2026-10-21',has_document:true};
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
 const saved={...emptyWorkspace(),version:1,findings:[finding],objective:'Review exit flexibility',review_objective:'Review exit flexibility'};
 const requests: string[]=[];
 globalThis.fetch=async (input,init)=>{
  const url=String(input); requests.push(`${init?.method ?? 'GET'} ${url}`);
  if(init?.method==='PUT') return Response.json({...JSON.parse(String(init.body)),version:2});
  return Response.json(saved);
 };
 function Workspace(){const [,setDirty]=useState(false);return <ReportWorkspace conversationId='a' document={{id:'doc',conversation_id:'a',filename:'lease.pdf',page_count:9,uploaded_at:'2026-10-21'}} onDirty={setDirty} onCitation={()=>{}}><p>Document chat</p></ReportWorkspace>;}
 const router=createMemoryRouter([{path:'/workspaces/a',element:<Workspace/>}],{initialEntries:['/workspaces/a?view=report']});
 render(<RouterProvider router={router}/>); const user=userEvent.setup();
 await screen.findByRole('heading',{name:'Break notice'});
 assert(screen.getByRole('region',{name:'Report builder'}));
 await user.click(screen.getByRole('button',{name:'Add to report'}));
 const section=screen.getByRole('textbox',{name:'Key findings'}) as HTMLTextAreaElement;
 assert(section.value.includes('Review the notice provision.'));
 await user.type(section,' Lawyer decision: request clarification.');
 await user.click(screen.getByRole('button',{name:'Save workspace'}));
 await screen.findByText('Saved revision 2');
 assert(requests.includes('PUT /api/conversations/a/workspace'));
 const link=screen.getAllByRole('link',{name:'Inspect source on PDF page 7'})[0];
 assert(link); await user.click(link);
 assert.equal(new URLSearchParams(router.state.location.search).get('citation'),citationKey(finding));
 assert(section.value.includes('Lawyer decision'));
 router.dispose();
});
