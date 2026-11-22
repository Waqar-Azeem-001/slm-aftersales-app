import { prisma } from './db';

/** Best-effort links from stored names to dealer / customer rows. */
export async function resolveLinks(distributor?: string | null, dealerChecked?: string | null, customer?: string | null) {
  const find = async (name?: string | null) => (name ? ((await prisma.dealer.findFirst({ where: { name } }))?.id ?? null) : null);
  return {
    distributorId: await find(distributor),
    dealerCheckedId: await find(dealerChecked),
    customerId: customer ? ((await prisma.customer.findFirst({ where: { name: customer } }))?.id ?? null) : null,
  };
}
