import { GroupSessionHelper } from '../group-session.helper';

describe('GroupSessionHelper', () => {
  let helper: GroupSessionHelper;

  beforeEach(() => {
    jest.clearAllMocks();
    helper = new GroupSessionHelper();
  });

  describe('buildVoteResults', () => {
    it('returns empty array for empty votes list', () => {
      const result = helper.buildVoteResults([]);
      expect(result).toEqual([]);
    });

    it('aggregates votes correctly for a single place', () => {
      const votes = [
        { placeId: 'place-1', place: { id: 'place-1', name: 'Coffee Shop' }, member: { id: 'member-1' } },
        { placeId: 'place-1', place: { id: 'place-1', name: 'Coffee Shop' }, member: { id: 'member-2' } },
      ];

      const result = helper.buildVoteResults(votes);

      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(2);
      expect(result[0].voters).toHaveLength(2);
      expect(result[0].place).toEqual({ id: 'place-1', name: 'Coffee Shop' });
    });

    it('sorts results by vote count descending', () => {
      const votes = [
        { placeId: 'place-1', place: { id: 'place-1', name: 'Place A' }, member: { id: 'member-1' } },
        { placeId: 'place-2', place: { id: 'place-2', name: 'Place B' }, member: { id: 'member-2' } },
        { placeId: 'place-2', place: { id: 'place-2', name: 'Place B' }, member: { id: 'member-3' } },
        { placeId: 'place-2', place: { id: 'place-2', name: 'Place B' }, member: { id: 'member-4' } },
      ];

      const result = helper.buildVoteResults(votes);

      expect(result[0].place.id).toBe('place-2');
      expect(result[0].count).toBe(3);
      expect(result[1].place.id).toBe('place-1');
      expect(result[1].count).toBe(1);
    });

    it('collects correct voters per place', () => {
      const member1 = { id: 'member-1', userId: 'user-1' };
      const member2 = { id: 'member-2', userId: 'user-2' };

      const votes = [
        { placeId: 'place-1', place: { id: 'place-1' }, member: member1 },
        { placeId: 'place-1', place: { id: 'place-1' }, member: member2 },
      ];

      const result = helper.buildVoteResults(votes);

      expect(result[0].voters).toContain(member1);
      expect(result[0].voters).toContain(member2);
    });

    it('handles multiple places with one vote each', () => {
      const votes = [
        { placeId: 'place-a', place: { id: 'place-a' }, member: { id: 'm1' } },
        { placeId: 'place-b', place: { id: 'place-b' }, member: { id: 'm2' } },
        { placeId: 'place-c', place: { id: 'place-c' }, member: { id: 'm3' } },
      ];

      const result = helper.buildVoteResults(votes);

      expect(result).toHaveLength(3);
      result.forEach((r) => expect(r.count).toBe(1));
    });

    it('uses the place object from the first vote for a given placeId', () => {
      const firstPlace = { id: 'p1', name: 'First' };
      const votes = [
        { placeId: 'p1', place: firstPlace, member: { id: 'm1' } },
        { placeId: 'p1', place: { id: 'p1', name: 'Different' }, member: { id: 'm2' } },
      ];

      const result = helper.buildVoteResults(votes);

      expect(result[0].place).toBe(firstPlace);
    });
  });
});
