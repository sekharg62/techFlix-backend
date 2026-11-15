import prisma from '../src/utils/prisma';

async function main() {
  const email = 'sekhar@gmail.com';
  const password = 'password';

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password,
    },
    create: {
      email,
      name: 'TechFlix Admin',
      password,
    },
  });

  console.log('Seed user created/updated successfully:');
  console.log({ id: user.id, email: user.email });
  process.exit(0);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  });
