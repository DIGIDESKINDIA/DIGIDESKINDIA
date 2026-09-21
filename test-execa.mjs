import { execa } from 'execa';

async function test() {
  try {
    const result = await execa('soffice', ['--version']);
    console.log('Result:', result.stdout);
  } catch (error) {
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    console.log('Error code:', error.code);
  }
}

test();
