import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { avatarInitials, defaultPreferences, parsePreferences, PreferencesProvider, preferencesKey } from "../src/context/preferences";
import { useWorkspaceShortcuts } from "../src/hooks/use-workspace-shortcuts";
import { SettingsPage } from "../src/pages/SettingsPage";
import { WorkspaceNavigation } from "../src/components/WorkspaceNavigation";

afterEach(()=>{cleanup();localStorage.clear();});

test('preferences reject corrupt values and expose predictable defaults',()=>{
 assert.deepEqual(parsePreferences('not json'),defaultPreferences);
 assert.equal(parsePreferences('{"textSize":"huge","contrast":"true"}').textSize,'small');
 assert.equal(parsePreferences('{"contrast":"true"}').contrast,false);
 assert.equal(avatarInitials('Siobhan McKenzie'),'SM');
 assert.equal(avatarInitials(''),'Y');
});

test('text size and reading preferences persist across mounts',async()=>{
 const user=userEvent.setup();
 const first=render(<PreferencesProvider><SettingsPage/></PreferencesProvider>);
 await user.click(screen.getByRole('radio',{name:/large/i}));
 await user.click(screen.getByRole('checkbox',{name:/Higher contrast/}));
 await user.click(screen.getByRole('checkbox',{name:/Reading view/}));
 await user.type(screen.getByRole('textbox',{name:'Your name'}),'Siobhan');
 await waitFor(()=>assert.equal(document.documentElement.dataset.textSize,'large'));
 assert.equal(document.documentElement.dataset.contrast,'high');
 assert.equal(JSON.parse(localStorage.getItem(preferencesKey) ?? '{}').readingMode,true);
 first.unmount();
 render(<PreferencesProvider><SettingsPage/></PreferencesProvider>);
 assert((screen.getByRole('radio',{name:/large/i}) as HTMLInputElement).checked);
 assert.equal((screen.getByRole('textbox',{name:'Your name'}) as HTMLInputElement).value,'Siobhan');
});

test('opt-in shortcuts do not steal view commands while editing',()=>{
 let saves=0; const views:string[]=[];
 function Shortcuts({enabled}:{enabled:boolean}){useWorkspaceShortcuts(enabled,false,()=>{saves++;},view=>views.push(view));return <label>Editor<textarea/></label>;}
 const ui=render(<Shortcuts enabled={false}/>);
 fireEvent.keyDown(window,{key:'s',ctrlKey:true}); assert.equal(saves,0);
 ui.rerender(<Shortcuts enabled/>);
 fireEvent.keyDown(window,{key:'@',code:'Digit2',altKey:true,shiftKey:true}); assert.deepEqual(views,['report']);
 const input=screen.getByRole('textbox',{name:'Editor'});
 fireEvent.keyDown(input,{key:'!',code:'Digit1',altKey:true,shiftKey:true}); assert.deepEqual(views,['report']);
 fireEvent.keyDown(input,{key:'s',ctrlKey:true}); assert.equal(saves,1);
 ui.unmount();
 fireEvent.keyDown(window,{key:'s',ctrlKey:true}); assert.equal(saves,1);
});

test('settings and navigation pass automated semantic accessibility checks',async()=>{
 const router=createMemoryRouter([{path:'/',element:<PreferencesProvider><a href='#content'>Skip to settings</a><main id='content'><SettingsPage/></main></PreferencesProvider>}]);
 const first=render(<RouterProvider router={router}/>);
 let result=await axe.run(document.body,{rules:{'color-contrast':{enabled:false},'label-content-name-mismatch':{enabled:false}}});
 assert.deepEqual(result.violations.map(item=>`${item.id}: ${item.help}`),[]);
 first.unmount(); router.dispose();
 const navRouter=createMemoryRouter([{path:'*',element:<WorkspaceNavigation conversations={[{id:'a',title:'Lease',has_document:true,created_at:'2026-10-21',updated_at:'2026-10-21'}]} loading={false} onCreate={()=>{}} onDelete={()=>{}}/>}]);
 render(<RouterProvider router={navRouter}/>);
 result=await axe.run(document.body,{rules:{'color-contrast':{enabled:false},'label-content-name-mismatch':{enabled:false}}});
 assert.deepEqual(result.violations.map(item=>item.id),[]);
 navRouter.dispose();
});
