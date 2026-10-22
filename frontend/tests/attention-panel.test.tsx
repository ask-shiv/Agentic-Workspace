import assert from 'node:assert/strict';
import {afterEach,test} from 'node:test';
import {cleanup,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {AttentionPanel} from '../src/components/AttentionPanel';

afterEach(cleanup);

test('attention panel gives a count, toggles on demand and retains all outstanding questions',async()=>{
 const items=['Obtain payment records.','Confirm vacant possession.'];
 const view=render(<AttentionPanel items={items} current/>);
 const title=screen.getByText('Needs your attention');
 const disclosure=title.closest('details');assert(disclosure);assert.equal(disclosure.open,false);
 assert(screen.getByText('2 items'));
 const user=userEvent.setup();await user.click(title);assert.equal(disclosure.open,true);
 const region=screen.getByRole('region',{name:'Items requiring attention'});
 assert(region);
 assert.deepEqual(screen.getAllByRole('listitem').map(item=>item.textContent),items);
 await user.click(title);assert.equal(disclosure.open,false);
 view.rerender(<AttentionPanel items={['Check notice.']} current={false}/>);
 assert(screen.getByText('1 item'));assert(screen.getByText(/From an earlier investigation/));
 view.rerender(<AttentionPanel items={[]} current/>);assert.equal(screen.queryByText('Needs your attention'),null);
});
